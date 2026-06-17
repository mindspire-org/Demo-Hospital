import { useRef, useState, useCallback, useEffect } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Type,
  Save,
  Printer,
  FileText,
  ChevronDown,
  X,
  Palette
} from 'lucide-react'

export type RichTextEditorProps = {
  value: string
  onChange: (text: string) => void
  templates?: Array<{ name: string; content: string }>
  onPrint?: () => void
  onSave?: () => void
  readOnly?: boolean
}

export default function Diagnostic_RichTextEditor({ value, onChange, templates = [], onPrint, onSave, readOnly = false }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)

  const updateCounts = useCallback(() => {
    const text = editorRef.current?.innerText || ''
    setCharCount(text.length)
    setWordCount(text.trim() === '' ? 0 : text.trim().split(/\s+/).length)
  }, [])

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '<p><br></p>'
      updateCounts()
    }
  }, []) // Only on mount - avoid overwriting while user types

  const exec = useCallback((command: string, val: string | undefined = undefined) => {
    if (readOnly) return
    document.execCommand(command, false, val)
    editorRef.current?.focus()
    updateActiveFormats()
    updateCounts()
  }, [readOnly])

  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>()
    if (document.queryCommandState('bold')) formats.add('bold')
    if (document.queryCommandState('italic')) formats.add('italic')
    if (document.queryCommandState('underline')) formats.add('underline')
    if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough')
    if (document.queryCommandState('justifyLeft')) formats.add('justifyLeft')
    if (document.queryCommandState('justifyCenter')) formats.add('justifyCenter')
    if (document.queryCommandState('justifyRight')) formats.add('justifyRight')
    if (document.queryCommandState('justifyFull')) formats.add('justifyFull')
    if (document.queryCommandState('insertUnorderedList')) formats.add('insertUnorderedList')
    if (document.queryCommandState('insertOrderedList')) formats.add('insertOrderedList')
    setActiveFormats(formats)
  }, [])

  const handleInput = useCallback(() => {
    const html = editorRef.current?.innerHTML || ''
    onChange(html)
    updateCounts()
  }, [onChange, updateCounts])

  const applyTemplate = (content: string) => {
    if (editorRef.current && !readOnly) {
      editorRef.current.innerHTML = content
      onChange(content)
      updateCounts()
    }
    setShowTemplateMenu(false)
  }

  const toolbarBtn = (command: string, icon: React.ReactNode, title: string, isToggle = true) => (
    <button
      type="button"
      onClick={() => exec(command)}
      className={`p-2 rounded-md transition-colors ${
        isToggle && activeFormats.has(command)
          ? 'bg-violet-100 text-violet-700'
          : 'text-slate-600 hover:bg-slate-100'
      } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={title}
      disabled={readOnly}
    >
      {icon}
    </button>
  )

  const headingBtn = (level: string, icon: React.ReactNode, title: string) => (
    <button
      type="button"
      onClick={() => exec('formatBlock', level)}
      className={`p-2 rounded-md transition-colors text-slate-600 hover:bg-slate-100 ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={title}
      disabled={readOnly}
    >
      {icon}
    </button>
  )

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
        {/* Formatting */}
        <div className="flex items-center gap-0.5">
          {toolbarBtn('bold', <Bold className="w-4 h-4" />, 'Bold')}
          {toolbarBtn('italic', <Italic className="w-4 h-4" />, 'Italic')}
          {toolbarBtn('underline', <Underline className="w-4 h-4" />, 'Underline')}
          {toolbarBtn('strikeThrough', <Strikethrough className="w-4 h-4" />, 'Strikethrough')}
        </div>

        {/* Font family */}
        <select
          onChange={(e) => exec('fontName', e.target.value)}
          className="text-xs rounded-md border border-slate-300 px-1.5 py-1 bg-white text-slate-700 outline-none focus:border-violet-500"
          title="Font"
          defaultValue=""
        >
          <option value="" disabled>Font</option>
          <option value="Poppins">Poppins</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Courier New">Courier</option>
          <option value="Times New Roman">Times</option>
        </select>

        {/* Text color */}
        <div className="relative group">
          <button type="button" className="p-2 rounded-md text-slate-600 hover:bg-slate-100" title="Text Color">
            <Palette className="w-4 h-4" />
          </button>
          <div className="absolute top-full left-0 mt-1 hidden group-hover:grid group-focus-within:grid grid-cols-5 gap-1 p-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
            {['#000000','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#6366f1','#a855f7','#ec4899','#6b7280'].map(c => (
              <button key={c} type="button" onClick={() => exec('foreColor', c)} className="w-5 h-5 rounded-sm border border-slate-200" style={{ background: c }} />
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        {/* Headings */}
        <div className="flex items-center gap-0.5">
          {headingBtn('H1', <Heading1 className="w-4 h-4" />, 'Heading 1')}
          {headingBtn('H2', <Heading2 className="w-4 h-4" />, 'Heading 2')}
          {headingBtn('P', <Type className="w-4 h-4" />, 'Paragraph')}
        </div>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        {/* Alignment */}
        <div className="flex items-center gap-0.5">
          {toolbarBtn('justifyLeft', <AlignLeft className="w-4 h-4" />, 'Align Left')}
          {toolbarBtn('justifyCenter', <AlignCenter className="w-4 h-4" />, 'Align Center')}
          {toolbarBtn('justifyRight', <AlignRight className="w-4 h-4" />, 'Align Right')}
          {toolbarBtn('justifyFull', <AlignJustify className="w-4 h-4" />, 'Justify')}
        </div>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        {/* Lists */}
        <div className="flex items-center gap-0.5">
          {toolbarBtn('insertUnorderedList', <List className="w-4 h-4" />, 'Bullet List')}
          {toolbarBtn('insertOrderedList', <ListOrdered className="w-4 h-4" />, 'Numbered List')}
        </div>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        {/* Templates */}
        {templates.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplateMenu(v => !v)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Templates
              <ChevronDown className="w-3 h-3" />
            </button>
            {showTemplateMenu && (
              <div className="absolute top-full left-0 mt-1 z-50 w-64 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-500">Select Template</span>
                  <button onClick={() => setShowTemplateMenu(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {templates.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => applyTemplate(tpl.content)}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          )}
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        className={`min-h-[400px] max-h-[600px] overflow-y-auto p-6 text-slate-800 leading-relaxed outline-none ${
          readOnly ? 'cursor-default' : 'cursor-text'
        }`}
        style={{ fontSize: '14px', lineHeight: '1.7' }}
      />

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
        <div className="flex items-center gap-2">
          {readOnly && <span className="text-amber-600 font-medium">Read Only</span>}
          <span>Rich Text Editor</span>
        </div>
      </div>
    </div>
  )
}
