// src/components/Input.jsx
export default function Input({
    value,
    onChange,
    placeholder = '',
    type = 'text',
    className = '',
    ...rest              // <-- alle weiteren Props abfangen
}) {
    return (
        <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...rest}         /* <-- alle Extra-Props weitergeben (z. B. onKeyDown) */
        className={
            `w-full px-4 py-2 rounded-xl bg-gray-700 text-white border border-gray-600
            focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`
        }
        />
    );
}
