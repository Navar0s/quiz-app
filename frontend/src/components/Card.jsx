export default function Card({ children, className = '' }) {
    return (
        <div className={`bg-gray-800 text-white rounded-2xl p-6 shadow-md ${className}`}>
        {children}
        </div>
    );
}
