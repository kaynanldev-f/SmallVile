import Link from "next/link";

type NavigationProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export default function Navigation({
  mobile = false,
  onNavigate,
}: NavigationProps) {
  return (
    <nav
      className={`${
        mobile ? "flex flex-col gap-6" : "hidden md:flex items-center gap-8"
      }`}
    >
      <Link href="/em-cartaz" onClick={onNavigate}>
        Em cartaz
      </Link>

      <Link href="/lancamentos" onClick={onNavigate}>
        Lançamentos
      </Link>

      <Link href="/bomboniere" onClick={onNavigate}>
        Bomboniere
      </Link>
    </nav>
  );
}
