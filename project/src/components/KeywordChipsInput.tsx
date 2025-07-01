import React, { useRef, useState } from 'react';

interface KeywordChipsInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const KeywordChipsInput: React.FC<KeywordChipsInputProps> = ({ value, onChange, placeholder, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const keywords = value.split(';').map(k => k.trim()).filter(Boolean);

  const handleRemove = (idx: number) => {
    const newKeywords = keywords.filter((_, i) => i !== idx);
    onChange(newKeywords.join(';'));
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ';') && inputRef.current) {
      e.preventDefault();
      let val = inputValue;
      if (val.trim() !== '') {
        const newKeywords = [...keywords, val.trim()];
        onChange(newKeywords.join(';'));
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && inputValue === '' && keywords.length > 0) {
      // Remove last chip
      handleRemove(keywords.length - 1);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 border rounded-md px-2 py-1 bg-white dark:bg-gray-700 ${disabled ? 'opacity-60' : ''}`}
         style={{ minHeight: '2.5rem' }}>
      {keywords.map((kw, idx) => (
        <span key={idx} className="flex items-center border border-blue-400 bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded px-2 py-0.5 text-xs font-medium mr-1">
          {kw}
          <button
            type="button"
            className="ml-1 text-blue-400 hover:text-blue-700 focus:outline-none"
            onClick={() => handleRemove(idx)}
            tabIndex={-1}
            aria-label={`Remove keyword ${kw}`}
            disabled={disabled}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        className="flex-1 min-w-[6rem] border-none outline-none bg-transparent text-sm text-gray-900 dark:text-white"
        placeholder={placeholder || 'Type and press ; or Enter'}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
      />
    </div>
  );
};

export default KeywordChipsInput; 