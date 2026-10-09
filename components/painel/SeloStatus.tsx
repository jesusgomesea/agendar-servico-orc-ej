// Selo colorido da etapa do agendamento. As cores seguem o andamento: âmbar pede
// ação sua (recebido/confirmado), azul está em produção, verde terminou.
import { nomeStatus, type StatusAgendamento } from "@/lib/agenda";
import { cn } from "@/lib/cn";

const CORES: Record<StatusAgendamento, string> = {
  recebido: "border-aviso/40 text-aviso",
  confirmado: "border-aviso/40 text-aviso",
  sinal_pago: "border-info/40 text-info",
  realizado: "border-info/40 text-info",
  previa_enviada: "border-info/40 text-info",
  entregue: "border-ok/40 text-ok",
  cancelado: "border-borda-forte text-fraco line-through",
};

export default function SeloStatus({ status }: { status: StatusAgendamento }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full border px-2.5 text-xs whitespace-nowrap", CORES[status])}>
      {nomeStatus(status)}
    </span>
  );
}
