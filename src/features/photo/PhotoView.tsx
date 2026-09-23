import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Camera, Check, FileUp, Loader2, ScanLine, X } from 'lucide-react'

interface PhotoViewProps {
  subjects: string[]
  onClose: () => void
  onCreateTasks: (titles: string[], subject: string, minutes: number) => void
}

type Stage = 'pick' | 'camera' | 'ocr' | 'review'

/**
 * Convierte una foto del cuaderno en tareas usando OCR en el navegador
 * (Tesseract.js, open source). Flujo: cámara/archivo -> OCR -> revisar y
 * seleccionar líneas -> crear tareas.
 */
export default function PhotoView({ subjects, onClose, onCreateTasks }: PhotoViewProps) {
  const [stage, setStage] = useState<Stage>('pick')
  const [image, setImage] = useState<string>('')
  const [rawText, setRawText] = useState('')
  const [lines, setLines] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [subject, setSubject] = useState(subjects[0] ?? '')
  const [minutes, setMinutes] = useState(30)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (stage !== 'camera' || !videoRef.current || !streamRef.current) return undefined
    videoRef.current.srcObject = streamRef.current
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [stage])

  /** Divide el texto OCR en lineas-tarea plausibles (quita viñetas/números y duplicados). */
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

  async function runOcr(dataUrl: string) {
    setStage('ocr')
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

      const text = String(data.text ?? '').trim()
      setRawText(text)
      const parsed = parseLines(text)
      setLines(parsed)
      setSelected(new Set(parsed.map((_, index) => index)))
      setStage('review')
    } catch (err) {
      console.error('[photo] OCR fallo:', err)
      setStage('pick')
      setError('No se pudo leer el texto. Prueba con una foto más nítida y con buena luz.')
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
    void runOcr(dataUrl)
  }

  function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      setImage(dataUrl)
      void runOcr(dataUrl)
    }
    reader.readAsDataURL(file)
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

  return (
    <section className="modal photo-modal" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={19} /></button>

      {stage === 'pick' && (
        <>
          <span className="modal-symbol"><ScanLine size={22} /></span>
          <p className="section-kicker">Desde tu cuaderno</p>
          <h2>Foto a las notas</h2>
          <p className="muted-copy">Haz una foto a tu cuaderno o pizarra y la app leerá el texto con OCR (Tesseract.js, open source) para crear las tareas.</p>
          {error && <p className="voice-error" role="alert">{error}</p>}
          <div className="photo-grid">
            <button type="button" onClick={() => void openCamera()}><Camera size={22} /> Abrir cámara</button>
            <button type="button" onClick={() => fileRef.current?.click()}><FileUp size={22} /> Subir imagen</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFileSelected} />
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
          <p className="section-kicker">Leyendo la foto</p>
          <h2>Un momento…</h2>
          {image && <img className="photo-preview" src={image} alt="Foto capturada" />}
          <div className="photo-progress" aria-hidden="true"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          <p className="photo-progress-copy">{Math.round(progress * 100) < 100 ? `Reconociendo texto… ${Math.round(progress * 100)}%` : 'Terminando…'}</p>
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
            aria-label="Texto reconocido de la foto"
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