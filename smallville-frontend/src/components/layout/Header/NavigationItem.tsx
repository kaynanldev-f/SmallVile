import Link from "next/link";

interface NavigationItemProps {
  label: string;
  href: string;
}

export default function NavigationItem({ label, href }: NavigationItemProps) {
  return (
    <li>
      <Link
        href={href}
        className="text-white text-sm hover:opacity-80 transition-all ease-in-out duration-200"
      >
        {label}
      </Link>
    </li>
  );
}
