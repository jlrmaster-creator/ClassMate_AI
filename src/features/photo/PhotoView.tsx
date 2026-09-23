import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Camera, Check, FileUp, FileText, Loader2, ScanLine, X } from 'lucide-react'
// Worker de PDF.js como asset: solo se descarga cuando se procesa un documento
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

interface PhotoViewProps {
  subjects: string[]
  onClose: () => void
  onCreateTasks: (titles: string[], subject: string, minutes: number) => void
}

type Stage = 'pick' | 'camera' | 'ocr' | 'review'

/**
 * Convierte una foto del cuaderno o un PDF en tareas usando OCR en el navegador
 * (Tesseract.js + PDF.js, open source). Flujo: cámara/imagen/PDF -> OCR ->
 * revisar y seleccionar lineas -> crear tareas.
 */
export default function PhotoView({ subjects, onClose, onCreateTasks }: PhotoViewProps) {
  const [stage, setStage] = useState<Stage>('pick')
  const [image, setImage] = useState<string>('')
  const [ocrLabel, setOcrLabel] = useState('')
  const [rawText, setRawText] = useState('')
  const [lines, setLines] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [subject, setSubject] = useState(subjects[0] ?? '')
  const [minutes, setMinutes] = useState(30)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const imageFileRef = useRef<HTMLInputElement>(null)
  const pdfFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (stage !== 'camera' || !videoRef.current || !streamRef.current) return undefined
    videoRef.current.srcObject = streamRef.current
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [stage])

  /** Divide el texto OCR en lineas-tarea plausibles (quita viñetas/numeros y duplicados). */
  function parseLines(text: string): string[] {
    const seen = new Set<string>()
    return text
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(?:\d+[.):]\s*|[-•*▪]\s*|☐\s*)+/, '').trim())
      .filter((line) => {
        if (!line) return false
        if (/^\d+[.):]$/.test(line)) return false
        if (line.length > 180) return false
        if (line.length < 2) return false
        const key = line.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 40)
  }

  /** Pasa el texto OCR a la fase de revision (recalcula lineas y seleccion). */
  function finishOcr(text: string) {
    const cleaned = String(text ?? '').trim()
    setRawText(cleaned)
    const parsed = parseLines(cleaned)
    setLines(parsed)
    setSelected(new Set(parsed.map((_, index) => index)))
    setStage('review')
  }

  async function runOcrImage(dataUrl: string) {
    setStage('ocr')
    setOcrLabel('')
    setProgress(0)
    setError('')
    try {
      // Import dinamico: Tesseract solo se carga cuando el usuario lo necesita
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('spa', 1, {
        logger: (message) => {
          if (message.status === 'recognizing text') setProgress(message.progress)
        },
      })
      const { data } = await worker.recognize(dataUrl)
      await worker.terminate()
      finishOcr(String(data.text ?? ''))
    } catch (err) {
      console.error('[photo] OCR fallo:', err)
      setStage('pick')
      setError('No se pudo leer el texto. Prueba con una foto más nítida y con buena luz.')
    }
  }

  async function runOcrPdf(file: File) {
    setStage('ocr')
    setOcrLabel('Preparando documento…')
    setProgress(0)
    setError('')
    let worker: import('tesseract.js').Worker | null = null
    try {
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
      const totalPages = pdf.numPages
      let fullText = ''

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        setProgress((pageNumber - 1) / totalPages)
        const page = await pdf.getPage(pageNumber)

        // 1) Texto integrado (PDFs digitales): rapido y exacto, sin OCR.
        const textContent = await page.getTextContent()
        const embeddedItems: Array<{ str: string; hasEOL: boolean }> = []
        textContent.items.forEach((item) => {
          if ('str' in item && typeof item.str === 'string' && item.str.trim().length > 0) {
            embeddedItems.push({ str: item.str, hasEOL: 'hasEOL' in item && item.hasEOL === true })
          }
        })
        const embedded = embeddedItems
          .map((item) => item.str + (item.hasEOL ? '\n' : ' '))
          .join('')
          .replace(/ +/g, ' ')
          .trim()
        const meaningfulChars = embedded.replace(/\s/g, '').length

        setOcrLabel(`Página ${pageNumber} de ${totalPages} · ${meaningfulChars >= 20 ? 'texto integrado' : 'reconociendo…'}`)

        if (meaningfulChars >= 20) {
          // Página con texto digital real: la usamos tal cual.
          fullText += `\n${embedded}`
        } else {
          // 2) Escaneo/imagen: OCR como respaldo (solo si hace falta).
          if (!worker) {
            const { createWorker } = await import('tesseract.js')
            worker = await createWorker('spa')
          }
          const base = page.getViewport({ scale: 1 })
          // Escala adaptativa: objetivo ~2000px de ancho, sin pasar de 3x
          const scale = Math.min(3, Math.max(1.5, 2000 / base.width))
          const viewport = page.getViewport({ scale })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          await page.render({ canvas, viewport }).promise
          const { data } = await worker.recognize(canvas.toDataURL('image/jpeg', 0.9))
          fullText += `\n${data.text ?? ''}`
        }
        setProgress(pageNumber / totalPages)
      }

      if (worker) await worker.terminate()
      await pdf.cleanup()
      setOcrLabel('')
      finishOcr(fullText)
    } catch (err) {
      if (worker) await worker.terminate().catch(() => undefined)
      console.error('[photo] OCR PDF fallo:', err)
      setStage('pick')
      setError('No se pudo leer el documento. Asegúrate de que el PDF tiene texto o escaneos legibles.')
    }
  }

  async function openCamera() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setStage('camera')
    } catch {
      setError('No se pudo abrir la cámara. Comprueba los permisos o sube una imagen.')
    }
  }

  function capture() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 960
    const context = canvas.getContext('2d')
    if (!context) return
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setImage(dataUrl)
    void runOcrImage(dataUrl)
  }

  function onImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      setImage(dataUrl)
      void runOcrImage(dataUrl)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function onPdfSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    void runOcrPdf(file)
    event.target.value = ''
  }

  function toggleLine(index: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function onTextEdited(text: string) {
    setRawText(text)
    const parsed = parseLines(text)
    setLines(parsed)
    setSelected(new Set(parsed.map((_, index) => index)))
  }

  function create() {
    const titles = lines.filter((_, index) => selected.has(index)).map((line) => line.trim()).filter(Boolean)
    if (titles.length === 0) return
    onCreateTasks(titles, subject.trim() || 'General', minutes)
  }

  const selectedCount = lines.filter((_, index) => selected.has(index)).length
  const progressPercent = Math.round(progress * 100)

  return (
    <section className="modal photo-modal" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={19} /></button>

      {stage === 'pick' && (
        <>
          <span className="modal-symbol"><ScanLine size={22} /></span>
          <p className="section-kicker">Desde tu cuaderno o apuntes</p>
          <h2>Foto, imagen o PDF</h2>
          <p className="muted-copy">Haz una foto a tu cuaderno o sube un documento. Si el PDF tiene texto digital se extrae al instante; si es un escaneo, se lee con OCR (Tesseract.js + PDF.js, open source).</p>
          {error && <p className="voice-error" role="alert">{error}</p>}
          <div className="photo-grid">
            <button type="button" onClick={() => void openCamera()}><Camera size={22} /> Abrir cámara</button>
            <button type="button" onClick={() => imageFileRef.current?.click()}><FileUp size={22} /> Subir imagen</button>
            <button type="button" onClick={() => pdfFileRef.current?.click()}><FileText size={22} /> Subir PDF</button>
          </div>
          <input ref={imageFileRef} type="file" accept="image/*" capture="environment" hidden onChange={onImageSelected} />
          <input ref={pdfFileRef} type="file" accept="application/pdf" hidden onChange={onPdfSelected} />
        </>
      )}

      {stage === 'camera' && (
        <>
          <span className="modal-symbol"><Camera size={22} /></span>
          <p className="section-kicker">Cámara</p>
          <h2>Apunta al cuaderno</h2>
          <video ref={videoRef} className="photo-camera" autoPlay playsInline muted />
          <div className="photo-actions">
            <button className="primary-button" type="button" onClick={capture}><Camera size={17} /> Capturar</button>
            <button className="photo-cancel" type="button" onClick={() => setStage('pick')}>Cancelar</button>
          </div>
        </>
      )}

      {stage === 'ocr' && (
        <>
          <span className="modal-symbol"><Loader2 size={22} className="photo-spin" /></span>
          <p className="section-kicker">Leyendo</p>
          <h2>{ocrLabel || 'Un momento…'}</h2>
          {image && <img className="photo-preview" src={image} alt="Foto capturada" />}
          <div className="photo-progress" aria-hidden="true"><span style={{ width: `${progressPercent}%` }} /></div>
          <p className="photo-progress-copy">{ocrLabel ? `${ocrLabel} · ${progressPercent}%` : progressPercent < 100 ? `Reconociendo texto… ${progressPercent}%` : 'Terminando…'}</p>
        </>
      )}

      {stage === 'review' && (
        <>
          <span className="modal-symbol"><Check size={22} /></span>
          <p className="section-kicker">Revisa el texto</p>
          <h2>¿Qué apuntamos?</h2>
          {image && <img className="photo-preview photo-preview-small" src={image} alt="Foto capturada" />}
          <textarea
            className="photo-textarea"
            value={rawText}
            onChange={(event) => onTextEdited(event.target.value)}
            aria-label="Texto reconocido de la foto o documento"
          />
          <p className="photo-line-count">Marca las líneas que quieres convertir en tareas ({selectedCount} seleccionadas).</p>
          <div className="photo-lines">
            {lines.map((line, index) => (
              <label className={`photo-line ${selected.has(index) ? 'selected' : ''}`} key={`${line}-${index}`}>
                <input
                  type="checkbox"
                  checked={selected.has(index)}
                  onChange={() => toggleLine(index)}
                />
                <span>{line}</span>
              </label>
            ))}
          </div>
          <div className="photo-row">
            <label>Asignatura
              {subjects.length > 0
                ? <select value={subject} onChange={(event) => setSubject(event.target.value)}>{subjects.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                : <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ej. Historia" />}
            </label>
            <label>Tiempo estimado por tarea
              <select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>1 hora</option>
                <option value={90}>1,5 horas</option>
              </select>
            </label>
          </div>
          <button className="primary-button" type="button" onClick={create} disabled={selectedCount === 0}>
            Crear {selectedCount} {selectedCount === 1 ? 'tarea' : 'tareas'} <ArrowRight size={17} />
          </button>
        </>
      )}
    </section>
  )
}