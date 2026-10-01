import Button from "@/src/components/ui/Button";
import PersonIcon from "@mui/icons-material/Person";

export default function UserActions() {
  return (
    <div className="flex items-center gap-4">
      <Button variant="primary">Entrar</Button>

      <PersonIcon className="w-8 h-8 text-white" />
    </div>
  );
}
