import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** A labelled input for the auth forms, with the taller sizing they use */

interface AuthFieldProps extends React.ComponentProps<"input"> {
  id: string;
  label: string;
}

export function AuthField({ id, label, ...props }: AuthFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} className="h-10 rounded-xl" {...props} />
    </div>
  );
}
