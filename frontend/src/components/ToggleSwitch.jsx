import { useTheme } from '../theme-context';

export default function ToggleSwitch() {
    const { mode, toggleTheme } = useTheme();

    return (
        <button
        onClick={toggleTheme}
        className="text-sm text-gray-400 hover:text-white underline"
        >
        {mode === 'dark' ? '🌞 Lightmode aktivieren' : '🌙 Darkmode aktivieren'}
        </button>
    );
}
