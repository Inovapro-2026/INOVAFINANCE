// Catálogo de todas as frases do sistema para geração de áudio com ElevenLabs
// Cada frase será convertida em áudio e salva no Supabase Storage

export interface AudioPhrase {
  id: string;
  text: string;
  category: 'registros' | 'metas' | 'explicacoes' | 'feedback' | 'notificacoes' | 'confirmacoes' | 'saudacoes' | 'extras';
}

export const AUDIO_CATALOG: AudioPhrase[] = [
  // ========================
  // SAUDAÇÕES
  // ========================
  { id: 'saudacao_bom_dia', text: 'Bom dia', category: 'saudacoes' },
  { id: 'saudacao_boa_tarde', text: 'Boa tarde', category: 'saudacoes' },
  { id: 'saudacao_boa_noite', text: 'Boa noite', category: 'saudacoes' },
  { id: 'saudacao_intro', text: 'Sou a INOVA, suporte oficial do INOVAFINANCE. Como posso te ajudar hoje?', category: 'saudacoes' },
  { id: 'saudacao_que_posso_fazer', text: 'Que posso fazer por você?', category: 'saudacoes' },
  { id: 'saudacao_clique_microfone', text: 'Clique no microfone para falar comigo.', category: 'saudacoes' },
  { id: 'saudacao_falar_ia', text: 'Clique no microfone para falar com a IA.', category: 'saudacoes' },
  
  // ========================
  // REGISTROS
  // ========================
  { id: 'registro_salvo', text: 'Registro salvo com sucesso.', category: 'registros' },
  { id: 'registro_erro', text: 'Erro ao salvar o registro.', category: 'registros' },
  { id: 'gasto_registrado', text: 'Gasto registrado com sucesso.', category: 'registros' },
  { id: 'ganho_registrado', text: 'Ganho registrado com sucesso.', category: 'registros' },
  { id: 'transacao_registrada', text: 'Transação registrada com sucesso.', category: 'registros' },
  { id: 'pagamento_agendado', text: 'Pagamento agendado com sucesso!', category: 'registros' },
  { id: 'pagamento_registrado', text: 'Pagamento registrado com sucesso.', category: 'registros' },
  
  // ========================
  // METAS
  // ========================
  { id: 'meta_criada', text: 'Meta criada com sucesso.', category: 'metas' },
  { id: 'meta_atingida', text: 'Meta atingida! Parabéns!', category: 'metas' },
  { id: 'meta_nao_alcancada', text: 'Você ainda não alcançou sua meta.', category: 'metas' },
  { id: 'meta_atualizada', text: 'Meta atualizada com sucesso.', category: 'metas' },
  { id: 'sem_metas', text: 'Você ainda não tem metas cadastradas. Que tal criar uma agora?', category: 'metas' },
  { id: 'metas_sem_progresso', text: 'Atualize suas metas clicando em editar.', category: 'metas' },
  
  // ========================
  // EXPLICAÇÕES - CADASTRO
  // ========================
  { id: 'explicacao_nome', text: 'Vamos começar! Digite seu nome completo. Este será usado para identificar sua conta.', category: 'explicacoes' },
  { id: 'explicacao_email', text: 'Agora digite seu e-mail. Este campo é opcional, mas recomendamos preencher para recuperação de conta.', category: 'explicacoes' },
  { id: 'explicacao_telefone', text: 'Digite seu número de telefone com DDD. Usaremos para contato importante sobre sua conta.', category: 'explicacoes' },
  { id: 'explicacao_cpf', text: 'Agora digite seu CPF. Este documento é necessário para verificação de identidade.', category: 'explicacoes' },
  { id: 'explicacao_salario', text: 'Informe seu salário mensal e o dia do pagamento. Isso nos ajuda a organizar seu planejamento financeiro.', category: 'explicacoes' },
  { id: 'explicacao_saldos', text: 'Informe seu saldo atual em conta débito e crédito. Isso nos ajuda a calcular seu saldo total.', category: 'explicacoes' },
  { id: 'explicacao_cartao', text: 'Você possui cartão de crédito? Se sim, ative a opção e informe o limite e dia de vencimento.', category: 'explicacoes' },
  { id: 'explicacao_afiliado', text: 'Tem um código de indicação? Digite aqui para ganhar desconto especial.', category: 'explicacoes' },
  { id: 'explicacao_cupom', text: 'Possui cupom de desconto? Digite o código para aplicar.', category: 'explicacoes' },
  { id: 'explicacao_pix', text: 'Como afiliado, você receberá comissões. Informe sua chave PIX para receber os pagamentos.', category: 'explicacoes' },
  { id: 'explicacao_revisao', text: 'Revise seus dados antes de finalizar. Confira se todas as informações estão corretas.', category: 'explicacoes' },
  
  // ========================
  // EXPLICAÇÕES - TELAS
  // ========================
  { id: 'explicacao_dashboard', text: 'Esta é sua tela principal. Aqui você vê seu saldo e movimentações.', category: 'explicacoes' },
  { id: 'explicacao_gastos', text: 'Essa função permite que você controle seus gastos.', category: 'explicacoes' },
  { id: 'explicacao_metas_tela', text: 'Esta tela mostra suas metas financeiras.', category: 'explicacoes' },
  { id: 'explicacao_planejamento', text: 'Aqui você organiza seus pagamentos e metas do mês.', category: 'explicacoes' },
  { id: 'explicacao_cartao_tela', text: 'Gerencie seu cartão de crédito e limite disponível.', category: 'explicacoes' },
  
  // ========================
  // FEEDBACK - SALDO
  // ========================
  { id: 'feedback_saldo_atualizado', text: 'Saldo atualizado.', category: 'feedback' },
  { id: 'feedback_saldo_positivo', text: 'Você está com saldo positivo.', category: 'feedback' },
  { id: 'feedback_saldo_negativo', text: 'Saldo negativo, atenção!', category: 'feedback' },
  { id: 'feedback_saldo_disponivel', text: 'Seu saldo disponível é de', category: 'feedback' },
  { id: 'feedback_hoje_gastou', text: 'Hoje você gastou', category: 'feedback' },
  { id: 'feedback_sem_gastos', text: 'Você ainda não registrou gastos hoje.', category: 'feedback' },
  { id: 'feedback_credito_responsavel', text: 'Você está usando seu crédito de forma responsável. Continue assim!', category: 'feedback' },
  { id: 'feedback_credito_limite', text: 'Atenção! Seu limite está quase no máximo. Organize seus pagamentos no painel.', category: 'feedback' },
  { id: 'feedback_credito_nao_usado', text: 'Você não utilizou seu limite ainda.', category: 'feedback' },
  
  // ========================
  // NOTIFICAÇÕES
  // ========================
  { id: 'notif_nova', text: 'Nova notificação recebida.', category: 'notificacoes' },
  { id: 'notif_evento', text: 'Evento importante: revise sua meta.', category: 'notificacoes' },
  { id: 'notif_pagamento_hoje', text: 'Você tem pagamentos para hoje.', category: 'notificacoes' },
  { id: 'notif_sem_pagamento', text: 'Você não tem contas para pagar hoje.', category: 'notificacoes' },
  { id: 'notif_dia_salario', text: 'Hoje é dia de salário!', category: 'notificacoes' },
  { id: 'notif_amanha_salario', text: 'Amanhã é dia de salário.', category: 'notificacoes' },
  { id: 'notif_salario_creditado', text: 'Seu salário foi creditado hoje!', category: 'notificacoes' },
  { id: 'notif_adiantamento_creditado', text: 'Seu adiantamento foi creditado hoje!', category: 'notificacoes' },
  
  // ========================
  // CONFIRMAÇÕES
  // ========================
  { id: 'confirmar_excluir', text: 'Você tem certeza que deseja excluir?', category: 'confirmacoes' },
  { id: 'confirmar_salvo', text: 'Alterações salvas.', category: 'confirmacoes' },
  { id: 'confirmar_cadastro', text: 'Cadastro realizado com sucesso! Sua matrícula foi gerada.', category: 'confirmacoes' },
  { id: 'confirmar_pix_gerado', text: 'Código PIX gerado com sucesso! Copie o código ou escaneie o QR Code para pagar.', category: 'confirmacoes' },
  
  // ========================
  // PROCESSAMENTO
  // ========================
  { id: 'process_verificando', text: 'Verificando seus dados. Aguarde um momento.', category: 'extras' },
  { id: 'process_cadastro', text: 'Processando seu cadastro.', category: 'extras' },
  { id: 'process_pix', text: 'Gerando seu código PIX. Aguarde um momento.', category: 'extras' },
  { id: 'process_pronta', text: 'Pronta para ajudar', category: 'extras' },
  { id: 'process_toque_falar', text: 'Toque para falar', category: 'extras' },
  
  // ========================
  // TRIAL/ASSINATURA
  // ========================
  { id: 'trial_expirado', text: 'Seu período de teste de 24 horas terminou. Deseja assinar para continuar usando o INOVAFINANCE?', category: 'extras' },
  { id: 'trial_gratuito', text: 'Seu plano atual é gratuito. Para continuar usando a voz natural ISA, assine agora!', category: 'extras' },
  
  // ========================
  // NÚMEROS DINÂMICOS (templates)
  // ========================
  { id: 'num_dias_recebimento', text: 'Faltam dias para seu próximo recebimento.', category: 'extras' },
  { id: 'num_metas', text: 'Você tem metas cadastradas.', category: 'extras' },
  { id: 'num_meta_una', text: 'Você tem uma meta cadastrada.', category: 'extras' },
  { id: 'num_pagar_mes', text: 'Você tem a pagar este mês.', category: 'extras' },
  { id: 'num_limite_credito', text: 'Seu limite de crédito é de', category: 'extras' },
  { id: 'num_gastou_limite', text: 'Você já gastou do seu limite.', category: 'extras' },
  { id: 'num_resta', text: 'Resta disponível.', category: 'extras' },
  
  // ========================
  // SPLASH/WELCOME
  // ========================
  { id: 'welcome', text: 'Bem-vindo ao INOVAFINANCE! Seu assistente financeiro inteligente.', category: 'saudacoes' },
];

// Mapa para acesso rápido por ID
export const AUDIO_MAP = new Map<string, AudioPhrase>(
  AUDIO_CATALOG.map(phrase => [phrase.id, phrase])
);

// Agrupar por categoria
export const AUDIO_BY_CATEGORY = AUDIO_CATALOG.reduce((acc, phrase) => {
  if (!acc[phrase.category]) {
    acc[phrase.category] = [];
  }
  acc[phrase.category].push(phrase);
  return acc;
}, {} as Record<string, AudioPhrase[]>);

// Gerar caminho do arquivo de áudio
export function getAudioPath(phraseId: string): string {
  const phrase = AUDIO_MAP.get(phraseId);
  if (!phrase) return '';
  return `${phrase.category}/${phraseId}.mp3`;
}

// Gerar URL pública do áudio
export function getAudioUrl(phraseId: string, supabaseUrl: string): string {
  const path = getAudioPath(phraseId);
  if (!path) return '';
  return `${supabaseUrl}/storage/v1/object/public/audio-cache/${path}`;
}
