import { Cabecalho } from "@/components/loja/Cabecalho";
import { CarrinhoProvider } from "@/components/loja/carrinho";
import { Rodape } from "@/components/loja/Rodape";
import { WhatsAppFlutuante } from "@/components/loja/WhatsAppFlutuante";
import { categoriasComProdutos, lerConfig } from "@/lib/catalogo";

export default async function LayoutLoja({ children }: LayoutProps<"/">) {
  const [categorias, config] = await Promise.all([categoriasComProdutos(), lerConfig()]);

  return (
    <CarrinhoProvider>
      {!config.loja.aberta && (
        // Modo férias: o site continua no ar, só avisa (e o checkout bloqueia)
        <div className="bg-marrom px-4 py-2 text-center text-sm text-creme-claro">
          {config.loja.mensagem_fechada || "Estamos de férias! Voltamos em breve 💛"}
        </div>
      )}
      <Cabecalho categorias={categorias} />
      <main className="flex-1">{children}</main>
      <Rodape contato={config.contato} />
      <WhatsAppFlutuante numero={config.contato.whatsapp} />
    </CarrinhoProvider>
  );
}
