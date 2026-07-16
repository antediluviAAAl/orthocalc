'use client'

import React, { useState, useEffect, useRef } from 'react'
import { FolderArchive, ArchiveRestore, Upload, Check, AlertCircle, RefreshCw, FolderDown, Download, HelpCircle } from 'lucide-react'
import { zipSync } from 'fflate'
import styles from './DicomRepair.module.css'

interface LogEntry {
  time: string
  message: string
  type: 'info' | 'repaired' | 'skipped' | 'error'
}

interface Stats {
  totalFiles: number
  repaired: number
  skipped: number
  errors: number
  originalSize: number
  repairedSize: number
}

export default function DicomRepairWorkspace() {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [status, setStatus] = useState<'idle' | 'scanning' | 'processing' | 'done' | 'error'>('idle')
  const [mode, setMode] = useState<'write' | 'zip'>('zip')
  const [isFsaSupported, setIsFsaSupported] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [stats, setStats] = useState<Stats>({
    totalFiles: 0,
    repaired: 0,
    skipped: 0,
    errors: 0,
    originalSize: 0,
    repairedSize: 0
  })
  const [logs, setLogs] = useState<LogEntry[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const consoleRef = useRef<HTMLDivElement>(null)

  // Sniff File System Access API support on mount
  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'showDirectoryPicker' in window
    setIsFsaSupported(supported)
    // Always default to 'zip' (recommended/fastest)
    setMode('zip')
  }, [])

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [logs])

  const addLog = (message: string, type: 'info' | 'repaired' | 'skipped' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour12: false })
    setLogs(prev => [...prev, { time, message, type }])
  }

  // --- File Traversal & Selection ---

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (status !== 'idle') return

    const items = e.dataTransfer.items
    if (!items || items.length === 0) return

    setStatus('scanning')
    addLog('Scanning dropped folder...', 'info')
    
    const fileEntries: File[] = []
    
    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry()
          if (entry) {
            const files = await getFilesFromEntry(entry)
            fileEntries.push(...files)
          }
        }
      }
      
      const filtered = filterUtilityFiles(fileEntries)
      setSelectedFiles(filtered)
      addLog(`Scan complete. Found ${filtered.length} candidate scan files.`, 'info')
      setStatus('idle')
    } catch (err: any) {
      addLog(`Error scanning files: ${err.message}`, 'error')
      setStatus('idle')
    }
  }

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    setStatus('scanning')
    addLog('Scanning selected folder...', 'info')

    const fileList = Array.from(e.target.files)
    const filtered = filterUtilityFiles(fileList)
    
    setSelectedFiles(filtered)
    addLog(`Scan complete. Found ${filtered.length} candidate scan files.`, 'info')
    setStatus('idle')
  }

  // Filter out system files or script files
  const filterUtilityFiles = (files: File[]): File[] => {
    return files.filter(file => {
      const name = file.name.toLowerCase()
      // Skip text, markdowns, code, and system dotfiles
      if (name.startsWith('.') || 
          name.endsWith('.py') || 
          name.endsWith('.md') || 
          name.endsWith('.txt') || 
          name.endsWith('.sql') || 
          name.endsWith('.json')) {
        return false
      }
      return true
    })
  }

  // Recursive entry reader for drag-and-drop
  const getFilesFromEntry = async (entry: any): Promise<File[]> => {
    const files: File[] = []
    
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => entry.file(resolve, reject))
      // Inject relativePath relative to the dropped folder
      const path = entry.fullPath.startsWith('/') ? entry.fullPath.substring(1) : entry.fullPath
      Object.defineProperty(file, 'relativePath', {
        value: path,
        writable: false,
        configurable: true
      })
      files.push(file)
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader()
      
      const readEntriesBatch = (): Promise<any[]> => {
        return new Promise((resolve, reject) => {
          dirReader.readEntries(resolve, reject)
        })
      }

      let entries: any[] = []
      let batch = await readEntriesBatch()
      while (batch.length > 0) {
        entries = entries.concat(batch)
        batch = await readEntriesBatch()
      }

      for (const childEntry of entries) {
        const childFiles = await getFilesFromEntry(childEntry)
        files.push(...childFiles)
      }
    }
    
    return files
  }

  const triggerInputClick = () => {
    if (status !== 'idle') return
    fileInputRef.current?.click()
  }

  // --- Processing Engine ---

  const startRepair = async () => {
    if (selectedFiles.length === 0 || status !== 'idle') return

    setStatus('processing')
    setLogs([])
    setStats({
      totalFiles: selectedFiles.length,
      repaired: 0,
      skipped: 0,
      errors: 0,
      originalSize: 0,
      repairedSize: 0
    })
    setProgress({ current: 0, total: selectedFiles.length })

    let outputDirHandle: any = null
    const zipData: Record<string, Uint8Array> = {}

    // 1. If Direct Mode, open Directory Picker first
    if (mode === 'write') {
      try {
        addLog('Requesting authorization to write files to disk...', 'info')
        outputDirHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite'
        })
        addLog('Output directory selected. Starting local repair loop...', 'info')
      } catch (err: any) {
        addLog(`Authorization denied or folder picker closed: ${err.message}`, 'error')
        setStatus('idle')
        return
      }
    } else {
      addLog('Starting in-memory decompression. Repaired items will be compiled to ZIP...', 'info')
    }

    // 2. Initialize Web Worker
    let worker: Worker
    try {
      worker = new Worker(new URL('./dicom-worker.ts', import.meta.url))
    } catch (err: any) {
      addLog(`Failed to initialize off-thread Web Worker: ${err.message}. Falling back to main-thread processing.`, 'error')
      setStatus('idle')
      return
    }

    let currentIndex = 0
    
    // Process queue recursively (concurrency = 1 for stability)
    const processNext = async () => {
      if (currentIndex >= selectedFiles.length) {
        // Queue complete!
        if (mode === 'zip') {
          addLog('Generating and compressing final ZIP download archive...', 'info')
          try {
            const zippedArr = zipSync(zipData)
            const blob = new Blob([zippedArr], { type: 'application/zip' })
            const url = URL.createObjectURL(blob)
            
            const link = document.createElement('a')
            link.href = url
            link.download = 'orthocalc-repaired-scans.zip'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            
            URL.revokeObjectURL(url)
            addLog('Repaired scans ZIP archive successfully downloaded.', 'info')
          } catch (zipErr: any) {
            addLog(`Error compiling ZIP archive: ${zipErr.message}`, 'error')
          }
        }
        
        addLog('--- Repair Workspace Completed ---', 'info')
        setStatus('done')
        worker.terminate()
        return
      }

      const file = selectedFiles[currentIndex]
      const relPath = (file as any).relativePath || file.webkitRelativePath || file.name

      addLog(`Processing file ${currentIndex + 1}/${selectedFiles.length}: ${relPath}`, 'info')

      // Promise wrapper to await worker output
      const processPromise = new Promise<void>((resolve) => {
        worker.onmessage = async (e: MessageEvent) => {
          const result = e.data

          if (result.status === 'SUCCESS_REPAIRED') {
            const fileData = result.data as Uint8Array
            const sizeReduction = ((result.originalSize - result.newSize) / result.originalSize * 100).toFixed(0)
            
            addLog(`✔ Repaired: ${relPath} (Unzipped inner ${result.innerFilename}, file size: ${formatBytes(result.newSize)})`, 'repaired')
            
            setStats(prev => ({
              ...prev,
              repaired: prev.repaired + 1,
              originalSize: prev.originalSize + result.originalSize,
              repairedSize: prev.repairedSize + result.newSize
            }))

            if (mode === 'write' && outputDirHandle) {
              await writeFileToDirectory(outputDirHandle, relPath, fileData)
            } else {
              zipData[relPath] = fileData
            }

          } else if (result.status === 'SUCCESS_SKIPPED') {
            const fileData = result.data as Uint8Array
            const infoMsg = result.isDicom 
              ? `Already valid raw DICOM. Copying file unmodified.`
              : `Non-scan configuration file. Copying file unmodified.`

            addLog(`· Skipped: ${relPath} (${infoMsg})`, 'skipped')
            
            setStats(prev => ({
              ...prev,
              skipped: prev.skipped + 1,
              originalSize: prev.originalSize + result.originalSize,
              repairedSize: prev.repairedSize + result.newSize
            }))

            if (mode === 'write' && outputDirHandle) {
              await writeFileToDirectory(outputDirHandle, relPath, fileData)
            } else {
              zipData[relPath] = fileData
            }

          } else if (result.status === 'ERROR') {
            addLog(`❌ Failed to decode ${relPath}: ${result.error}`, 'error')
            setStats(prev => ({
              ...prev,
              errors: prev.errors + 1
            }))
          }

          setProgress({ current: currentIndex + 1, total: selectedFiles.length })
          currentIndex++
          resolve()
        }
      })

      // Send the file object off to worker thread
      worker.postMessage({ file, relativePath: relPath })
      await processPromise
      
      // Schedule next item in the event loop
      setTimeout(processNext, 0)
    }

    // Trigger loop execution
    processNext()
  }

  // Recursively creates folders and writes file to FSA directory handle
  const writeFileToDirectory = async (
    rootHandle: FileSystemDirectoryHandle,
    relativePath: string,
    data: Uint8Array
  ) => {
    try {
      const parts = relativePath.split('/')
      let currentDirHandle = rootHandle

      // Traverse through path segments, creating folders as needed
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (!part) continue
        currentDirHandle = await currentDirHandle.getDirectoryHandle(part, { create: true })
      }

      // Get handle for output file
      const fileName = parts[parts.length - 1]
      const fileHandle = await currentDirHandle.getFileHandle(fileName, { create: true })
      
      // Write data stream
      const writable = await fileHandle.createWritable()
      await writable.write(data as any)
      await writable.close()
    } catch (err: any) {
      addLog(`Disk Write Error on ${relativePath}: ${err.message}`, 'error')
    }
  }

  const resetWorkspace = () => {
    setSelectedFiles([])
    setStatus('idle')
    setLogs([])
    setProgress({ current: 0, total: 0 })
    setStats({
      totalFiles: 0,
      repaired: 0,
      skipped: 0,
      errors: 0,
      originalSize: 0,
      repairedSize: 0
    })
  }

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  return (
    <div className={styles.workspace}>
      
      {/* Guidelines / Steps */}
      <div className={styles.card} style={{ borderLeft: '4px solid var(--primary)', background: 'rgba(59, 130, 246, 0.01)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArchiveRestore size={18} className={styles.accentIcon} />
          <span>DICOM Repair Guide</span>
        </h3>
        <div className={styles.guidelinesList}>
          <div className={styles.guidelineStep}>
            <span className={styles.stepNumber}>1</span>
            <div className={styles.stepText}>
              <strong>Extract scanned files:</strong> If your scan folder is compressed in a <code>.rar</code> or <code>.zip</code> file, extract it to a normal folder on your computer first.
            </div>
          </div>
          <div className={styles.guidelineStep}>
            <span className={styles.stepNumber}>2</span>
            <div className={styles.stepText}>
              <strong>Drag & Drop:</strong> Select that extracted folder and drag it directly into the drop zone below, or click to browse.
            </div>
          </div>
          <div className={styles.guidelineStep}>
            <span className={styles.stepNumber}>3</span>
            <div className={styles.stepText}>
              <div>
                <strong>Repair:</strong> Run the tool. By default, it will compile and download a clean, uncompressed <code>.zip</code> folder compatible with RadiAnt.
              </div>
              <div className={styles.warningNote}>
                <AlertCircle size={14} className={styles.warningIcon} />
                <span><strong>Note:</strong> The browser window may briefly pause or freeze for a few seconds at 100% while compressing the final folder. This is normal; the download will start automatically once compression completes.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Drop Zone Panel */}
      <div className={styles.card}>
        <div 
          className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerInputClick}
        >
          <input 
            type="file"
            ref={fileInputRef}
            className={styles.fileInput}
            onChange={handleFolderSelect}
            // @ts-ignore
            webkitdirectory=""
            directory=""
            multiple
          />
          
          <FolderArchive size={48} className={styles.dropZoneIcon} />
          
          {selectedFiles.length === 0 ? (
            <>
              <p className={styles.dropZoneText}>Drag & drop scan directory here</p>
              <p className={styles.dropZoneSub}>or click to select folder from your computer</p>
            </>
          ) : (
            <>
              <p className={styles.dropZoneText}>Selected Scan Folder Loaded</p>
              <p className={styles.dropZoneSub}>
                {selectedFiles.length} files queued. Ready to process.
              </p>
            </>
          )}
        </div>

        {/* Selected files count and actions if files loaded */}
        {selectedFiles.length > 0 && status === 'idle' && (
          <div className={styles.optionsGroup}>
            {/* Option B: ZIP */}
            <div 
              className={`${styles.optionCard} ${mode === 'zip' ? styles.optionCardActive : ''}`}
              onClick={() => setMode('zip')}
            >
              <input 
                type="radio" 
                checked={mode === 'zip'} 
                onChange={() => {}}
                className={styles.optionInput} 
              />
              <div className={styles.optionDetails}>
                <span className={styles.optionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span>Consolidated ZIP Archive</span>
                  <span className={`${styles.badge} ${styles.badgeRepaired}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>Recommended & Fastest</span>
                </span>
                <span className={styles.optionDesc}>
                  Processes scans in memory and triggers a download of a consolidated `.zip` file. Best for typical scan folders and runs instantly.
                </span>
              </div>
            </div>

            {/* Option A: Direct write */}
            <div 
              className={`${styles.optionCard} ${mode === 'write' ? styles.optionCardActive : ''} ${!isFsaSupported ? styles.optionCardDisabled : ''}`}
              onClick={() => isFsaSupported && setMode('write')}
              style={!isFsaSupported ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <input 
                type="radio" 
                checked={mode === 'write'} 
                disabled={!isFsaSupported}
                onChange={() => {}}
                className={styles.optionInput} 
              />
              <div className={styles.optionDetails}>
                <span className={styles.optionTitle}>Direct Save (Advanced)</span>
                <span className={styles.optionDesc}>
                  Writes files directly to a folder on your computer's disk. Recommended for very large datasets (1GB+) to bypass browser RAM limits.
                </span>
                {!isFsaSupported && (
                  <span className={styles.optionDesc} style={{ color: 'var(--destructive)', marginTop: 4, fontWeight: 'bold' }}>
                    * Unsupported on this browser. Chrome, Edge, or Opera required.
                  </span>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Buttons */}
        {selectedFiles.length > 0 && (
          <div className={styles.actions}>
            {status === 'idle' && (
              <>
                <button 
                  onClick={resetWorkspace} 
                  className={styles.secondaryBtn}
                >
                  Clear Files
                </button>
                <button 
                  onClick={startRepair} 
                  className={styles.primaryBtn}
                >
                  <ArchiveRestore size={18} />
                  <span>Repair DICOMs</span>
                </button>
              </>
            )}

            {status === 'done' && (
              <button 
                onClick={resetWorkspace} 
                className={styles.primaryBtn}
              >
                <Check size={18} />
                <span>Finish & Reset</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Process Progress Banner */}
      {(status === 'processing' || status === 'done') && (
        <div className={styles.card}>
          <div className={styles.progressSection}>
            <div className={styles.progressInfo}>
              <span>
                {status === 'processing' ? 'Repairing and verifying scans...' : 'Decompression repair complete!'}
              </span>
              <span>
                {progress.current} / {progress.total} files ({((progress.current / progress.total) * 100).toFixed(0)}%)
              </span>
            </div>
            <div className={styles.progressBarOuter}>
              <div 
                className={styles.progressBarInner}
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>

          {/* Stats Summary Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Total Scanned</span>
              <span className={styles.statValue}>{stats.totalFiles}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Repaired (Unzipped)</span>
              <span className={styles.statValue} style={{ color: 'var(--success)' }}>{stats.repaired}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Unmodified</span>
              <span className={styles.statValue} style={{ color: 'var(--primary)' }}>{stats.skipped}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Failures</span>
              <span className={styles.statValue} style={stats.errors > 0 ? { color: 'var(--destructive)' } : {}}>{stats.errors}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Live Console Logs */}
      {(logs.length > 0 || status === 'scanning') && (
        <div className={styles.card}>
          <div className={styles.logSection}>
            <h3 className={styles.logTitle}>Workspace Logs</h3>
            <div className={styles.logConsole} ref={consoleRef}>
              {status === 'scanning' && logs.length === 0 && (
                <div className={styles.logLine}>
                  <span className={styles.badge} style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>Scanning</span>
                  <span className={styles.logMessage}>Traversing directories...</span>
                </div>
              )}
              {logs.map((log, idx) => (
                <div key={idx} className={styles.logLine}>
                  <span className={styles.logTime}>[{log.time}]</span>
                  <span className={`${styles.badge} ${
                    log.type === 'repaired' ? styles.badgeRepaired :
                    log.type === 'skipped' ? styles.badgeSkipped :
                    log.type === 'error' ? styles.badgeError : styles.badgeInfo
                  }`}>
                    {log.type}
                  </span>
                  <span className={styles.logMessage}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
