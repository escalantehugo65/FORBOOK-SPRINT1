// Íconos de trazo. Son decorativos: el texto del botón o del enlace da el significado.
function Icon({ children, strokeWidth = 2 }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>;
}

export const ArrowIcon = () => <Icon><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></Icon>;
export const ExternalIcon = () => <Icon><path d="M14 4h6v6"/><path d="M10 14L20 4"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></Icon>;
export const MenuIcon = () => <Icon><path d="M4 7h16M4 12h16M4 17h16"/></Icon>;
export const CloseIcon = () => <Icon strokeWidth={2.6}><path d="M6 6l12 12M18 6L6 18"/></Icon>;
export const CheckIcon = () => <Icon strokeWidth={2.6}><path d="M5 12.5l4.5 4.5L19 7.5"/></Icon>;
export const SunIcon = () => <Icon><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></Icon>;
export const MoonIcon = () => <Icon><path d="M20.5 13.4A8.7 8.7 0 0 1 10.6 3.5a8.7 8.7 0 1 0 9.9 9.9Z"/></Icon>;
export const PinIcon = () => <Icon><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></Icon>;
export const BookIcon = () => <Icon><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/><path d="M9 8h7"/></Icon>;
export const HomeIcon = () => <Icon><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/></Icon>;
export const UsersIcon = () => <Icon><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M17 14c2.5 0 4 2 4 5"/></Icon>;
export const ChatIcon = () => <Icon><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/><path d="M9.5 10a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.7-.9 1.4"/></Icon>;
export const ShieldIcon = () => <Icon><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></Icon>;
export const SearchIcon = () => <Icon><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></Icon>;
// Puntos de Forbook: una moneda con un destello.
export const PointsIcon = () => <Icon><circle cx="12" cy="12" r="9"/><path d="M12 7.2l1.3 3.5 3.5 1.3-3.5 1.3L12 16.8l-1.3-3.5L7.2 12l3.5-1.3z"/></Icon>;
export const BagIcon = () => <Icon><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></Icon>;
export const CameraIcon = () => <Icon><path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.4"/></Icon>;
export const ChevronIcon = () => <Icon strokeWidth={2.4}><path d="M6.5 9.5L12 15l5.5-5.5"/></Icon>;
export const LogoutIcon = () => <Icon><path d="M14 4h5v16h-5"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/></Icon>;
export const UserIcon = () => <Icon><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.8-3.8 3.8-6 7.5-6s6.7 2.2 7.5 6"/></Icon>;
export const SparkleIcon = () => <Icon><path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/></Icon>;

// Comunidades y chat.
export const BellIcon = () => <Icon><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></Icon>;
export const BellOffIcon = () => <Icon><path d="M6 16V11a6 6 0 0 1 1.3-3.7M10 5.3A6 6 0 0 1 18 11v4"/><path d="M4.5 18h12"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/><path d="M4 4l16 16"/></Icon>;
export const ImageIcon = () => <Icon><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4.5 17l4.5-4 3.5 3 3-2.5 4 3.5"/></Icon>;
export const MicIcon = () => <Icon><rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/></Icon>;
export const StopIcon = () => <Icon><rect x="6.5" y="6.5" width="11" height="11" rx="2"/></Icon>;
export const SendIcon = () => <Icon><path d="M4 12l16-7-6 16-2.5-6.5z"/><path d="M11.5 14.5L20 5"/></Icon>;
export const TrashIcon = () => <Icon><path d="M5 7h14"/><path d="M9.5 7V4.5h5V7"/><path d="M7 7l.8 12.5h8.4L17 7"/></Icon>;
export const PlusIcon = () => <Icon strokeWidth={2.4}><path d="M12 5v14M5 12h14"/></Icon>;
export const TargetIcon = () => <Icon><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.8"/></Icon>;
export const FlagIcon = () => <Icon><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></Icon>;
