export default function Modal({ children, onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg max-w-md w-full text-white relative">
        <button onClick={onClose} className="absolute top-2 right-4 text-gray-400 hover:text-white text-lg">×</button>
        {children}
        </div>
        </div>
    );
}
