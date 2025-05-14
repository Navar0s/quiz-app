// src/components/Button.jsx
export default function Button({
    children,
    onClick,
    disabled = false,
    variant = 'primary',
    className = '', // Wichtig: className wird von außen übergeben
    type = 'button',
}) {
    const base = // "w-full" entfernt
    'inline-flex items-center justify-center font-semibold ' +
    'py-2 px-4 rounded-xl transition duration-150';

    const variants = {
        primary     : 'bg-blue-500 hover:bg-blue-400 text-black',
        secondary   : 'bg-gray-600 hover:bg-gray-500 text-white',
        success     : 'bg-green-600 hover:bg-green-500 text-white',
        destructive : 'bg-red-600 hover:bg-red-500 text-white',
    };

    return (
        <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={[ // className von außen wird hier hinzugefügt und kann w-full oder Flex-Klassen enthalten
            base,
            variants[variant] ?? variants.primary,
            disabled ? 'opacity-50 cursor-not-allowed' : '',
            className,
        ].join(' ').trim()} // .trim() für den Fall, dass className leer ist
        >
        {children}
        </button>
    );
}
