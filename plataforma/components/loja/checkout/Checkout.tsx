"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Icone, type NomeIcone } from "@/components/Icone";
import type { ConfigLoja } from "@/lib/catalogo";
import { calcularFrete, formatarBRL } from "@/lib/preco";
import type { Produto } from "@/lib/types";
import {
  mascararCep,
  mascararWhatsApp,
  semErros,
  somenteDigitos,
  validarDados,
  validarEndereco,
  type DadosCliente,
  type Endereco,
  type Erros,
} from "@/lib/validacao";
import { CampoCupom, useCupom } from "../cupom";
import { useLinhasCarrinho, type LinhaCarrinho } from "../linhas-carrinho";
import { botaoContorno, botaoPrimario } from "../ui";
import { useEstadoCheckout, type EstadoCheckout } from "./estado";
import { UploadFotosItem } from "./UploadFotosItem";

type Etapa = "dados" | "entrega" | "fotos" | "revisao";
const TITULOS: Record<Etapa, string> = { dados: "Seus dados", entrega: "Entrega", fotos: "Fotos", revisao: "Revisão" };

export function Checkout({ produtos, config }: { produtos: Produto[]; config: ConfigLoja }) {
  const { linhas, subtotal, carregado } = useLinhasCarrinho(produtos);
  const { estado, atualizar } = useEstadoCheckout();
  const cupom = useCupom(subtotal);
  const [etapaEscolhida, setEtapa] = useState<Etapa>("dados");
  const [mostrarErros, setMostrarErros] = useState(false);

  if (!carregado || !estado) {
    return <p className="py-20 text-center text-texto-suave">Carregando…</p>;
  }

  if (!config.loja.aberta) {
    return <Aviso titulo="A loja está fechada no momento" texto={config.loja.mensagem_fechada} />;
  }

  if (linhas.length === 0) {
    return (
      <Aviso titulo="Seu carrinho está vazio" texto="Escolha seus produtos antes de finalizar.">
        <Link href="/produtos" className={botaoPrimario}>Ver produtos</Link>
      </Aviso>
    );
  }

  const linhasComFotos = linhas.filter((l) => l.fotosMax > 0);
  const etapas: Etapa[] = ["dados", "entrega", ...(linhasComFotos.length ? (["fotos"] as const) : []), "revisao"];
  // se o carrinho mudou e a etapa "fotos" deixou de existir, volta para uma etapa válida
  const etapa = etapas.includes(etapaEscolhida) ? etapaEscolhida : "revisao";
  const indice = etapas.indexOf(etapa);

  const errosDados = validarDados(estado.dados);
  const errosEndereco: Erros<Endereco> = estado.tipoEntrega === "envio" ? validarEndereco(estado.endereco) : {};
  const fotosPendentes = linhasComFotos.filter((l) => !fotosOk(l, estado));
  const valido: Record<Etapa, boolean> = {
    dados: semErros(errosDados),
    entrega: semErros(errosEndereco),
    fotos: fotosPendentes.length === 0,
    revisao: true,
  };

  const desconto = cupom.aplicado?.desconto ?? 0;
  const freteBase = calcularFrete(subtotal, estado.tipoEntrega, config.frete);
  const frete = cupom.aplicado?.freteGratis ? 0 : freteBase;
  const total = Math.max(0, subtotal - desconto) + frete;

  function avancar() {
    if (!valido[etapa]) {
      setMostrarErros(true);
      return;
    }
    setMostrarErros(false);
    setEtapa(etapas[indice + 1]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function irPara(e: Etapa) {
    // só permite pular para etapas cujas anteriores estão válidas
    const alvo = etapas.indexOf(e);
    if (etapas.slice(0, alvo).every((x) => valido[x])) {
      setMostrarErros(false);
      setEtapa(e);
    }
  }

  const setDados = (campo: keyof DadosCliente, valor: string) =>
    atualizar((s) => ({ ...s, dados: { ...s.dados, [campo]: valor } }));
  const setEndereco = (parcial: Partial<Endereco>) =>
    atualizar((s) => ({ ...s, endereco: { ...s.endereco, ...parcial } }));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        {/* Indicador de etapas */}
        <ol className="mb-6 flex gap-1 overflow-x-auto">
          {etapas.map((e, i) => (
            <li key={e} className="flex-1">
              <button
                type="button"
                onClick={() => irPara(e)}
                aria-current={e === etapa ? "step" : undefined}
                className={`w-full border-b-[3px] pb-2 text-left text-xs font-bold uppercase tracking-wider sm:text-sm ${
                  i < indice ? "border-sucesso text-sucesso" : i === indice ? "border-marrom text-marrom" : "border-borda text-texto-fraco"
                }`}
              >
                {i < indice ? <Icone nome="confirmado" className="mr-1 inline h-3.5 w-3.5" /> : `${i + 1}. `}
                {TITULOS[e]}
              </button>
            </li>
          ))}
        </ol>

        {etapa === "dados" && (
          <Cartao titulo="Seus dados" subtitulo="Usamos o WhatsApp para avisar cada etapa do seu pedido.">
            <Campo rotulo="Nome completo" erro={mostrarErros ? errosDados.nome : undefined}>
              <input
                className={input}
                autoComplete="name"
                value={estado.dados.nome}
                onChange={(e) => setDados("nome", e.target.value)}
                placeholder="Maria da Silva"
              />
            </Campo>
            <Campo rotulo="WhatsApp" erro={mostrarErros ? errosDados.whatsapp : undefined}>
              <input
                className={input}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={mascararWhatsApp(estado.dados.whatsapp)}
                onChange={(e) => setDados("whatsapp", somenteDigitos(e.target.value).slice(0, 11))}
                placeholder="(33) 99999-9999"
              />
            </Campo>
            <Campo rotulo="E-mail (opcional)" dica="Para receber a confirmação do pedido" erro={mostrarErros ? errosDados.email : undefined}>
              <input
                className={input}
                type="email"
                autoComplete="email"
                value={estado.dados.email}
                onChange={(e) => setDados("email", e.target.value)}
                placeholder="voce@email.com"
              />
            </Campo>
          </Cartao>
        )}

        {etapa === "entrega" && (
          <Cartao titulo="Como você quer receber?">
            <div className="mb-5 grid gap-2 sm:grid-cols-2">
              <OpcaoEntrega
                ativa={estado.tipoEntrega === "envio"}
                onClick={() => atualizar((s) => ({ ...s, tipoEntrega: "envio" }))}
                icone="caminhao"
                titulo="Enviar para meu endereço"
                texto={
                  calcularFrete(subtotal, "envio", config.frete) === 0
                    ? "Frete grátis!"
                    : `Frete ${formatarBRL(config.frete.valor)}${config.frete.gratis_acima ? ` · grátis acima de ${formatarBRL(config.frete.gratis_acima)}` : ""}`
                }
              />
              {config.retirada.ativa && (
                <OpcaoEntrega
                  ativa={estado.tipoEntrega === "retirada"}
                  onClick={() => atualizar((s) => ({ ...s, tipoEntrega: "retirada" }))}
                  icone="casa"
                  titulo="Retirar com a gente"
                  texto={`Grátis${config.retirada.endereco ? ` · ${config.retirada.endereco}` : ""}`}
                />
              )}
            </div>
            {estado.tipoEntrega === "envio" && (
              <FormEndereco endereco={estado.endereco} erros={mostrarErros ? errosEndereco : {}} onChange={setEndereco} />
            )}
            <Campo rotulo="Observações (opcional)">
              <textarea
                className={`${input} min-h-20`}
                maxLength={1000}
                value={estado.observacoes}
                onChange={(e) => atualizar((s) => ({ ...s, observacoes: e.target.value }))}
                placeholder="Algum detalhe sobre o pedido ou a entrega?"
              />
            </Campo>
          </Cartao>
        )}

        {etapa === "fotos" && (
          <div className="space-y-4">
            <div className="rounded-card bg-dourado-claro/60 p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <Icone nome="camera" className="h-5 w-5 text-marrom" />
                Hora de enviar suas fotos!
              </p>
              <p className="mt-1 text-texto-suave">
                Escolha as fotos de cada produto. Elas ficam guardadas com segurança e só são usadas para produzir o seu pedido.
              </p>
            </div>
            {linhasComFotos.map((l) => (
              <UploadFotosItem
                key={l.item.chave}
                linha={l}
                sessao={estado.sessao}
                fotos={estado.fotos[l.item.chave] ?? []}
                onAdicionar={(foto) =>
                  atualizar((s) => ({
                    ...s,
                    fotos: { ...s.fotos, [l.item.chave]: [...(s.fotos[l.item.chave] ?? []), foto] },
                  }))
                }
                onRemover={(caminho) =>
                  atualizar((s) => ({
                    ...s,
                    fotos: { ...s.fotos, [l.item.chave]: (s.fotos[l.item.chave] ?? []).filter((f) => f.caminho !== caminho) },
                  }))
                }
              />
            ))}
            {mostrarErros && fotosPendentes.length > 0 && (
              <p className="text-sm text-perigo">Complete as fotos de: {fotosPendentes.map((l) => l.produto.nome).join(", ")}.</p>
            )}
          </div>
        )}

        {etapa === "revisao" && (
          <Cartao titulo="Confira seu pedido">
            <Bloco titulo="Contato" onEditar={() => irPara("dados")}>
              <p>{estado.dados.nome}</p>
              <p>{mascararWhatsApp(estado.dados.whatsapp)}</p>
              {estado.dados.email && <p>{estado.dados.email}</p>}
            </Bloco>
            <Bloco titulo="Entrega" onEditar={() => irPara("entrega")}>
              {estado.tipoEntrega === "retirada" ? (
                <p>Retirada{config.retirada.endereco ? ` · ${config.retirada.endereco}` : ""}</p>
              ) : (
                <>
                  <p>
                    {estado.endereco.rua}, {estado.endereco.numero}
                    {estado.endereco.complemento && ` · ${estado.endereco.complemento}`}
                  </p>
                  <p>
                    {estado.endereco.bairro} · {estado.endereco.cidade}/{estado.endereco.uf.toUpperCase()} · CEP{" "}
                    {mascararCep(estado.endereco.cep)}
                  </p>
                </>
              )}
              {estado.observacoes && <p className="mt-1 italic">&ldquo;{estado.observacoes}&rdquo;</p>}
            </Bloco>
            {linhasComFotos.length > 0 && (
              <Bloco titulo="Fotos" onEditar={() => irPara("fotos")}>
                {linhasComFotos.map((l) => {
                  const n = (estado.fotos[l.item.chave] ?? []).length;
                  return (
                    <p key={l.item.chave}>
                      <Icone nome="confirmado" className="mr-1 inline h-3.5 w-3.5 text-sucesso" />{l.produto.nome}: {n} {n === 1 ? "foto" : "fotos"}
                    </p>
                  );
                })}
              </Bloco>
            )}
            <p className="mt-4 text-xs text-texto-suave">
              Produtos personalizados são feitos sob medida: troca apenas em caso de defeito de produção.
              Produção em até {config.prazo_producao.dias_uteis} dias úteis após a confirmação do pagamento
              {estado.tipoEntrega === "envio" && ", mais o prazo dos Correios"}.
            </p>
          </Cartao>
        )}

        {/* Navegação */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {indice > 0 ? (
            <button type="button" onClick={() => setEtapa(etapas[indice - 1])} className={botaoContorno}>
              ← Voltar
            </button>
          ) : (
            <Link href="/carrinho" className={botaoContorno}>← Carrinho</Link>
          )}
          {etapa !== "revisao" ? (
            <button type="button" onClick={avancar} className={botaoPrimario}>
              Continuar →
            </button>
          ) : (
            // O pagamento Pix (criação do pedido + QR Code) é o Prompt 6
            <div className="text-center sm:text-right">
              <button type="button" disabled className={`${botaoPrimario} w-full sm:w-auto`}>
                Pagar {formatarBRL(total)} com Pix
              </button>
              <p className="mt-1 text-xs text-texto-fraco">O pagamento com Pix chega na próxima etapa.</p>
            </div>
          )}
        </div>
      </div>

      <Resumo
        linhas={linhas}
        subtotal={subtotal}
        frete={frete}
        total={total}
        tipoEntrega={estado.tipoEntrega}
        cupom={cupom}
      />
    </div>
  );
}

function fotosOk(l: LinhaCarrinho, estado: EstadoCheckout): boolean {
  const n = (estado.fotos[l.item.chave] ?? []).length;
  return n >= l.fotosMin && n <= l.fotosMax;
}

// ---------------------------------------------------------------------------
// Endereço com preenchimento automático pelo CEP (ViaCEP, gratuito)
// ---------------------------------------------------------------------------
function FormEndereco({
  endereco,
  erros,
  onChange,
}: {
  endereco: Endereco;
  erros: Erros<Endereco>;
  onChange: (p: Partial<Endereco>) => void;
}) {
  const [buscando, setBuscando] = useState(false);
  const [cepNaoEncontrado, setCepNaoEncontrado] = useState(false);

  async function aoDigitarCep(valor: string) {
    const cep = somenteDigitos(valor).slice(0, 8);
    onChange({ cep });
    setCepNaoEncontrado(false);
    if (cep.length !== 8) return;
    setBuscando(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await r.json();
      if (j.erro) setCepNaoEncontrado(true);
      else onChange({ rua: j.logradouro || "", bairro: j.bairro || "", cidade: j.localidade || "", uf: j.uf || "" });
    } catch {
      // sem internet / ViaCEP fora: o cliente preenche à mão
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="mb-2 grid grid-cols-6 gap-x-3">
      <Campo className="col-span-6 sm:col-span-3" rotulo="CEP" erro={erros.cep ?? (cepNaoEncontrado ? "CEP não encontrado. Preencha o endereço abaixo." : undefined)} dica={buscando ? "Buscando endereço…" : undefined}>
        <input className={input} inputMode="numeric" autoComplete="postal-code" value={mascararCep(endereco.cep)} onChange={(e) => aoDigitarCep(e.target.value)} placeholder="00000-000" />
      </Campo>
      <Campo className="col-span-6" rotulo="Rua" erro={erros.rua}>
        <input className={input} autoComplete="address-line1" value={endereco.rua} onChange={(e) => onChange({ rua: e.target.value })} />
      </Campo>
      <Campo className="col-span-2" rotulo="Número" erro={erros.numero}>
        <input className={input} value={endereco.numero} onChange={(e) => onChange({ numero: e.target.value })} />
      </Campo>
      <Campo className="col-span-4" rotulo="Complemento">
        <input className={input} autoComplete="address-line2" value={endereco.complemento} onChange={(e) => onChange({ complemento: e.target.value })} placeholder="Apto, bloco…" />
      </Campo>
      <Campo className="col-span-6 sm:col-span-2" rotulo="Bairro" erro={erros.bairro}>
        <input className={input} value={endereco.bairro} onChange={(e) => onChange({ bairro: e.target.value })} />
      </Campo>
      <Campo className="col-span-4 sm:col-span-3" rotulo="Cidade" erro={erros.cidade}>
        <input className={input} autoComplete="address-level2" value={endereco.cidade} onChange={(e) => onChange({ cidade: e.target.value })} />
      </Campo>
      <Campo className="col-span-2 sm:col-span-1" rotulo="UF" erro={erros.uf}>
        <input className={`${input} uppercase`} maxLength={2} autoComplete="address-level1" value={endereco.uf} onChange={(e) => onChange({ uf: e.target.value.toUpperCase() })} />
      </Campo>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Peças visuais
// ---------------------------------------------------------------------------
const input =
  "w-full rounded-xl border-[1.5px] border-borda bg-white px-4 py-3 text-base outline-none transition focus:border-terracota";

function Campo({ rotulo, erro, dica, className = "", children }: { rotulo: string; erro?: string; dica?: string; className?: string; children: ReactNode }) {
  return (
    <label className={`mb-4 block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold">{rotulo}</span>
      {children}
      {erro ? (
        <span className="mt-1 block text-sm text-perigo">{erro}</span>
      ) : (
        dica && <span className="mt-1 block text-xs text-texto-suave">{dica}</span>
      )}
    </label>
  );
}

function Cartao({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <section className="rounded-grande border border-borda bg-cartao p-5 sm:p-7">
      <h2 className="text-2xl font-semibold">{titulo}</h2>
      {subtitulo && <p className="mt-1 text-sm text-texto-suave">{subtitulo}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function OpcaoEntrega({ ativa, onClick, icone, titulo, texto }: { ativa: boolean; onClick: () => void; icone: NomeIcone; titulo: string; texto: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativa}
      className={`flex items-start gap-3 rounded-card border-[1.5px] p-4 text-left transition ${ativa ? "border-terracota bg-terracota-claro" : "border-borda hover:border-terracota"}`}
    >
      <Icone nome={icone} className="mt-0.5 h-5 w-5 shrink-0 text-terracota" />
      <span>
        <span className="block font-semibold">{titulo}</span>
        <span className="text-sm text-texto-suave">{texto}</span>
      </span>
    </button>
  );
}

function Bloco({ titulo, onEditar, children }: { titulo: string; onEditar: () => void; children: ReactNode }) {
  return (
    <div className="border-b border-borda py-3 text-sm last:border-0">
      <div className="mb-1 flex justify-between">
        <span className="font-bold">{titulo}</span>
        <button type="button" onClick={onEditar} className="text-terracota underline-offset-2 hover:underline">
          Editar
        </button>
      </div>
      <div className="text-texto-suave">{children}</div>
    </div>
  );
}

function Resumo({
  linhas,
  subtotal,
  frete,
  total,
  tipoEntrega,
  cupom,
}: {
  linhas: LinhaCarrinho[];
  subtotal: number;
  frete: number;
  total: number;
  tipoEntrega: "envio" | "retirada";
  cupom: ReturnType<typeof useCupom>;
}) {
  return (
    <aside className="h-fit rounded-grande border border-borda bg-cartao p-5 lg:sticky lg:top-24">
      <h2 className="mb-4 text-xl font-semibold">Resumo</h2>
      <ul className="mb-4 space-y-3">
        {linhas.map((l) => (
          <li key={l.item.chave} className="flex gap-3 text-sm">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-terracota-claro">
              <Image src={l.produto.imagens[0]} alt="" fill sizes="48px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">{l.produto.nome}</p>
              <p className="text-xs text-texto-suave">
                {[...Object.values(l.item.opcoes), l.item.quantidade > 1 ? `${l.item.quantidade}×` : null].filter(Boolean).join(" · ")}
              </p>
            </div>
            <span className="font-semibold">{formatarBRL(l.total)}</span>
          </li>
        ))}
      </ul>
      <div className="space-y-1 border-t border-borda pt-3 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatarBRL(subtotal)}</span></div>
        {cupom.aplicado && cupom.aplicado.desconto > 0 && (
          <div className="flex justify-between text-sucesso">
            <span>Cupom {cupom.aplicado.codigo}</span>
            <span>− {formatarBRL(cupom.aplicado.desconto)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>{tipoEntrega === "retirada" ? "Retirada" : "Frete"}</span>
          <span>{frete === 0 ? "Grátis" : formatarBRL(frete)}</span>
        </div>
      </div>
      <CampoCupom {...cupom} />
      <div className="mt-3 flex justify-between border-t border-borda pt-3">
        <span className="font-semibold">Total</span>
        <span className="font-display text-2xl font-bold text-marrom">{formatarBRL(total)}</span>
      </div>
    </aside>
  );
}

function Aviso({ titulo, texto, children }: { titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="py-20 text-center">
      <h2 className="text-2xl font-semibold">{titulo}</h2>
      {texto && <p className="mb-6 mt-2 text-texto-suave">{texto}</p>}
      {children}
    </div>
  );
}
