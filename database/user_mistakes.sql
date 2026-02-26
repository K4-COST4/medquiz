-- Tabela para fila de erros (Review Queue)
create table if not exists public.user_mistakes (
    user_id uuid references auth.users(id) on delete cascade,
    question_id uuid references public.track_questions(id) on delete cascade, 
    -- NOTA: Se as questões de live/banco global entrarem aqui, precisa ajustar a FK ou remover.
    -- Por enquanto assumindo track_questions, mas se for híbrido, melhor remover a FK ou usar polimorfismo.
    -- Como sua tabela de questões principal parece ser 'question_bank' ou 'track_questions'?
    -- No schema anterior vi 'question_bank'. Vou verificar.
    
    created_at timestamp with time zone default now(),
    
    primary key (user_id, question_id)
);

-- Index para busca rápida por aula (se a questão tiver metadata de aula)
-- Mas a questão tem 'topics' ou id.
-- Para filtrar "Erros desta aula", precisaremos fazer JOIN com a tabela de questões.
