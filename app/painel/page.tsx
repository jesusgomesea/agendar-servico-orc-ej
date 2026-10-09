// /painel — área do fotógrafo (login obrigatório). O conteúdo está em components/painel/Painel.tsx.
"use client";

import Protegido from "@/components/auth/Protegido";
import Painel from "@/components/painel/Painel";

export default function PainelPage() {
  return (
    <Protegido>
      <Painel />
    </Protegido>
  );
}
