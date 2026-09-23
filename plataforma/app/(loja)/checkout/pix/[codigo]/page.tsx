import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PixPagamento } from "@/components/loja/checkout/PixPagamento";
import { botaoContorno } from "@/components/loja/ui";
import { lerConfig } from "@/lib/catalogo";
import { createAdminClient } from "@/lib/supabase/admin";

// Nunca cachear: o status do pagamento muda.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pagamento com Pix",
  robots: { index: false, follow: false },
};

const REGEX_CODIGO = /^AP-\d{4}-\d{4}$/;

// ATENÇÃO (dívida conhecida): o código do pedido é sequencial, logo adivinhável.
// Por isso esta página mostra SÓ valor, status e QR Code — nenhum dado pessoal
// do cliente. O acompanhamento completo (Prompt 8) precisa de um token próprio
// no lugar do código, senão vira porta para varrer pedidos alheios.
export default async function PaginaPix({ params }: PageProps<"/checkout/pix/[codigo]">) {
  const { codigo } = await params;
  if (!REGEX_CODIGO.test(codigo)) notFound();

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    notFound();
  }

  const [{ data: pedido }, config] = await Promise.all([
    supabase
      .from("pedidos")
      .select("codigo, total, status, pix_qrcode, pix_copia_cola, pix_expira_em")
      .eq("codigo", codigo)
      .maybeSingle(),
    lerConfig(),
  ]);

  if (!pedido) notFound();

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <PixPagamento
        codigo={pedido.codigo}
        total={Number(pedido.total)}
        status={pedido.status}
        qrcodeBase64={pedido.pix_qrcode}
        copiaCola={pedido.pix_copia_cola}
        expiraEm={pedido.pix_expira_em}
        whatsapp={config.contato.whatsapp}
        prazoDias={config.prazo_producao.dias_uteis}
      />
      <div className="mt-8 text-center">
        <Link href="/produtos" className={botaoContorno}>
          Continuar comprando
        </Link>
      </div>
    </section>
  );
}
