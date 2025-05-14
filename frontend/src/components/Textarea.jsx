// src/components/Textarea.jsx
import React from 'react';

const Textarea = React.forwardRef( // forwardRef ist nützlich, falls du mal eine Ref brauchst
(
    { className = '', rows = 3, ...props }, // Standardmäßig 3 Zeilen hoch
 ref
) => {
    return (
        <textarea
        ref={ref}
        rows={rows} // Anzahl der sichtbaren Zeilen
        className={`
            block w-full
            p-2
            border border-gray-600
            bg-gray-700
            rounded-md
            text-white
            placeholder-gray-400
            focus:outline-none
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            resize-y ${/* Erlaubt vertikales Ändern der Größe, oder 'resize-none' */''}
            ${className}
            `}
            {...props} // Übergibt alle anderen Props wie value, onChange, placeholder etc.
            />
    );
}
);

Textarea.displayName = 'Textarea'; // Hilfreich für React DevTools

export default Textarea;
