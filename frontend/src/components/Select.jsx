export default function Select({ value, onChange, options = [] }) {
    return (
        <select
        value={value}
        onChange={onChange}
        className="w-full px-4 py-2 rounded-xl bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
        {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
        ))}
        </select>
    );
}
