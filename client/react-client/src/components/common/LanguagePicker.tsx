import type { Language } from '../../constants/languages';

interface LanguagePickerProps {
  languages: Language[];
  selected: string;
  onSelect: (code: string) => void;
}

export default function LanguagePicker({ languages, selected, onSelect }: LanguagePickerProps) {
  return (
    <div className="vs-lang-grid">
      {languages.map((lang) => (
        <button key={lang.code} type="button"
          className={`vs-lang-btn ${selected === lang.code ? 'active' : ''}`}
          onClick={() => onSelect(lang.code)}>
          <span className="vs-lang-flag">{lang.flag}</span>
          <span className="vs-lang-label">{lang.label}</span>
        </button>
      ))}
    </div>
  );
}
