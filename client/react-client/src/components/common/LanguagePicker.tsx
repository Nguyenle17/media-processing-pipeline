import type { Language } from '../../constants/languages';

interface LanguagePickerProps {
  languages: Language[];
  selected: string;
  onSelect: (code: string) => void;
}

export default function LanguagePicker({ languages, selected, onSelect }: LanguagePickerProps) {
  return (
    <div className="vs-lang-grid" role="group" aria-label="Language">
      {languages.map((lang) => {
        const isSelected = selected === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            className={`vs-lang-btn ${isSelected ? 'active' : ''}`}
            onClick={() => onSelect(lang.code)}
            aria-pressed={isSelected}
          >
            <span className="vs-lang-code">{lang.code.toUpperCase()}</span>
            <span className="vs-lang-label">{lang.label}</span>
          </button>
        );
      })}
    </div>
  );
}
