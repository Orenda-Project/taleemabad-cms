---
name: generate-component
description: Generate a new React component with proper types, exports, and structure
argument-hint: "[ComponentName]"
user-invocable: true
disable-model-invocation: false
---

# Generate React Component

Create a new component with TypeScript types, proper exports, and TailwindCSS styling.

## What This Does

1. **Creates Component File** — `src/components/ComponentName.tsx`
2. **Defines Types** — Props interface with JSDoc comments
3. **Implements Component** — Functional component with hooks
4. **Adds Styling** — TailwindCSS classes
5. **Exports Type** — Export both component and props type
6. **Updates Index** — Add export to `src/components/index.ts`

## Usage

```
/generate-component FormInput

/generate-component [ComponentName] [with-state | with-api | basic]
```

## Generated Template

```typescript
import { ReactNode } from 'react';

/**
 * FormInput - A reusable text input component
 * @component
 * 
 * @param {FormInputProps} props - Component props
 * @returns {ReactNode} Rendered form input
 * 
 * @example
 * <FormInput 
 *   label="Email" 
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 *   placeholder="user@example.com"
 * />
 */

export interface FormInputProps {
  /** Input label text */
  label?: string;
  /** Input value */
  value: string;
  /** onChange callback */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Input placeholder */
  placeholder?: string;
  /** Input type (text, email, password, etc.) */
  type?: string;
  /** Is input disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
}

export function FormInput({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  disabled = false,
  error,
}: FormInputProps): ReactNode {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
      />
      {error && (
        <span className="text-sm text-red-600">{error}</span>
      )}
    </div>
  );
}
```

## Options

### `basic`
Simple presentational component — props, no state, no API calls.

### `with-state`
Adds useState hook, local state management, lifecycle handling.

### `with-api`
Adds useEffect, API calls, loading/error states, request cancellation.

## Next Steps After Generation

1. **Update Props** — Modify interface to match your needs
2. **Add Logic** — Implement component functionality
3. **Test** — Use in a page, verify appearance
4. **Style** — Adjust TailwindCSS classes
5. **Commit** — `git add src/components/ComponentName.tsx`

## Export Pattern

```typescript
// src/components/index.ts
export { FormInput, type FormInputProps } from './FormInput';
export { MyComponent, type MyComponentProps } from './MyComponent';
```

Then import anywhere:
```typescript
import { FormInput, type FormInputProps } from '@/components';
```
