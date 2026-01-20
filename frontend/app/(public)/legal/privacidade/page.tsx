import { BackButton } from '@/components/ui/back-button';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                <BackButton />
                <div className="bg-white p-8 sm:p-12 shadow-lg rounded-2xl border border-gray-200">
                    <article className="prose prose-slate lg:prose-lg mx-auto">
                        <div className="text-center mb-8 pb-6 border-b-2 border-blue-600">
                            <h1 className="text-4xl font-bold text-gray-900 mb-3">Política de Privacidade</h1>
                            <p className="text-lg font-semibold text-blue-600">Dá-lhe Med</p>
                            <p className="text-sm text-gray-600 mt-2">
                                <strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}
                            </p>
                        </div>

                        <div className="bg-blue-50 border-l-4 border-blue-600 p-5 rounded-r-lg mb-8">
                            <p className="text-base leading-relaxed m-0">
                                A sua privacidade é fundamental para nós. Esta Política de Privacidade descreve de forma clara e transparente como o <strong>Dá-lhe Med</strong> ("nós", "nosso" ou "Plataforma") coleta, usa, armazena, compartilha e protege suas informações pessoais, em total conformidade com a <strong>Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018)</strong> e demais legislações aplicáveis.
                            </p>
                        </div>

                        <p className="text-lg text-gray-700">
                            Ao utilizar a plataforma Dá-lhe Med, você declara ter lido, compreendido e concordado com todos os termos desta Política de Privacidade. Caso não concorde com qualquer disposição aqui apresentada, solicitamos que descontinue imediatamente o uso de nossos serviços.
                        </p>

                        <hr className="my-10 border-gray-300" />

                        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">1. Definições Importantes</h2>

                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
                            <ul className="space-y-3 m-0">
                                <li><strong>Dados Pessoais:</strong> Qualquer informação relacionada a pessoa natural identificada ou identificável.</li>
                                <li><strong>Titular:</strong> Pessoa natural a quem se referem os dados pessoais (você, usuário).</li>
                                <li><strong>Controlador:</strong> Dá-lhe Med, responsável pelas decisões sobre o tratamento de dados.</li>
                                <li><strong>Tratamento:</strong> Toda operação realizada com dados pessoais (coleta, armazenamento, uso, compartilhamento, eliminação).</li>
                                <li><strong>Consentimento:</strong> Manifestação livre, informada e inequívoca pela qual você autoriza o tratamento de seus dados.</li>
                            </ul>
                        </div>

                        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">2. Informações que Coletamos</h2>

                        <p className="text-gray-700">
                            Para proporcionar a melhor experiência educacional possível, coletamos diferentes categorias de dados pessoais:
                        </p>

                        <h3 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">2.1. Dados Fornecidos Diretamente por Você</h3>

                        <div className="ml-4 space-y-4">
                            <div className="border-l-4 border-blue-400 pl-4">
                                <p className="font-semibold text-gray-800 mb-2">Dados de Cadastro e Autenticação:</p>
                                <ul className="mt-2">
                                    <li>Nome completo</li>
                                    <li>Endereço de e-mail</li>
                                    <li>Foto de perfil (quando autenticação via Google OAuth ou similar)</li>
                                    <li>Senha criptografada (se aplicável)</li>
                                    <li>Dados opcionais de perfil (instituição de ensino, especialidade médica, ano de formação)</li>
                                </ul>
                            </div>

                            <div className="border-l-4 border-green-400 pl-4">
                                <p className="font-semibold text-gray-800 mb-2">Conteúdo Educacional:</p>
                                <ul className="mt-2">
                                    <li>Textos, anotações e resumos inseridos na plataforma</li>
                                    <li>Arquivos enviados (PDFs, documentos, imagens)</li>
                                    <li>Flashcards criados ou personalizados</li>
                                    <li>Objetivos e metas de estudo definidos</li>
                                    <li>Perguntas e respostas em quizzes</li>
                                </ul>
                            </div>

                            <div className="border-l-4 border-purple-400 pl-4">
                                <p className="font-semibold text-gray-800 mb-2">Dados de Comunicação:</p>
                                <ul className="mt-2">
                                    <li>Mensagens enviadas ao suporte técnico</li>
                                    <li>Feedbacks e avaliações da plataforma</li>
                                    <li>Respostas a pesquisas de satisfação</li>
                                </ul>
                            </div>
                        </div>

                        <h3 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">2.2. Dados Coletados Automaticamente</h3>

                        <div className="ml-4 space-y-4">
                            <div className="border-l-4 border-orange-400 pl-4">
                                <p className="font-semibold text-gray-800 mb-2">Dados de Uso e Desempenho Acadêmico:</p>
                                <ul className="mt-2">
                                    <li>Respostas aos quizzes e taxa de acertos/erros</li>
                                    <li>Tempo de estudo e frequência de acesso</li>
                                    <li>Trilhas de aprendizado acessadas e progresso</li>
                                    <li>Flashcards revisados e programação de revisões (curva de esquecimento)</li>
                                    <li>Áreas de conhecimento com maior dificuldade</li>
                                    <li>Histórico de atividades educacionais</li>
                                </ul>
                            </div>

                            <div className="border-l-4 border-red-400 pl-4">
                                <p className="font-semibold text-gray-800 mb-2">Dados Técnicos e de Navegação:</p>
                                <ul className="mt-2">
                                    <li>Endereço IP e localização geográfica aproximada</li>
                                    <li>Tipo e versão do navegador</li>
                                    <li>Sistema operacional e dispositivo utilizado</li>
                                    <li>Páginas visitadas, tempo de permanência e cliques</li>
                                    <li>Origem de acesso (link referenciador)</li>
                                    <li>Logs de sistema para segurança e auditoria</li>
                                    <li>Cookies e identificadores únicos de sessão</li>
                                </ul>
                            </div>
                        </div>

                        <h3 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">2.3. Dados de Terceiros</h3>
                        <p className="text-gray-700 ml-4">
                            Quando você utiliza autenticação via Google ou outros provedores OAuth, recebemos informações básicas de perfil desses serviços, conforme autorizado por você durante o processo de login.
                        </p>

                        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">3. Finalidades e Bases Legais do Tratamento</h2>

                        <p className="text-gray-700 mb-6">
                            Utilizamos seus dados pessoais exclusivamente para as seguintes finalidades, sempre amparados por bases legais previstas na LGPD:
                        </p>

                        <div className="space-y-6">
                            <div className="bg-blue-50 p-5 rounded-lg border border-blue-200">
                                <h4 className="font-bold text-blue-900 text-lg mb-2">📋 Prestação e Execução dos Serviços (Art. 7º, V - LGPD)</h4>
                                <p className="text-gray-700 mb-2"><strong>Base Legal:</strong> Execução de contrato</p>
                                <ul className="text-gray-700">
                                    <li>Criar e gerenciar sua conta de usuário</li>
                                    <li>Permitir acesso aos quizzes, flashcards e trilhas de aprendizado</li>
                                    <li>Processar e armazenar seu conteúdo educacional</li>
                                    <li>Personalizar sua experiência de estudo</li>
                                    <li>Implementar sistema de repetição espaçada baseado na curva de esquecimento</li>
                                </ul>
                            </div>

                            <div className="bg-green-50 p-5 rounded-lg border border-green-200">
                                <h4 className="font-bold text-green-900 text-lg mb-2">🤖 Processamento via Inteligência Artificial (Art. 7º, V e I - LGPD)</h4>
                                <p className="text-gray-700 mb-2"><strong>Base Legal:</strong> Execução de contrato e consentimento</p>
                                <ul className="text-gray-700">
                                    <li>Utilizar APIs de IA (Google Gemini, OpenAI ou similares) para gerar flashcards, resumos e questões personalizadas</li>
                                    <li>Processar textos e PDFs enviados para extração de conteúdo educacional</li>
                                    <li>Analisar padrões de aprendizado para recomendações personalizadas</li>
                                </ul>
                                <p className="text-sm text-gray-600 mt-3 italic">
                                    <strong>Importante:</strong> Dados enviados para processamento por IA são utilizados exclusivamente para gerar respostas às suas solicitações. Não autorizamos o uso de seus dados para treinamento de modelos públicos sem seu consentimento explícito.
                                </p>
                            </div>

                            <div className="bg-purple-50 p-5 rounded-lg border border-purple-200">
                                <h4 className="font-bold text-purple-900 text-lg mb-2">📊 Melhoria e Desenvolvimento da Plataforma (Art. 7º, IX - LGPD)</h4>
                                <p className="text-gray-700 mb-2"><strong>Base Legal:</strong> Legítimo interesse</p>
                                <ul className="text-gray-700">
                                    <li>Analisar padrões agregados e anonimizados de desempenho</li>
                                    <li>Calibrar dificuldade de questões e qualidade do conteúdo</li>
                                    <li>Desenvolver novos recursos e funcionalidades</li>
                                    <li>Realizar pesquisas internas e análises estatísticas</li>
                                </ul>
                            </div>

                            <div className="bg-orange-50 p-5 rounded-lg border border-orange-200">
                                <h4 className="font-bold text-orange-900 text-lg mb-2">🔒 Segurança e Prevenção de Fraudes (Art. 7º, IX - LGPD)</h4>
                                <p className="text-gray-700 mb-2"><strong>Base Legal:</strong> Legítimo interesse</p>
                                <ul className="text-gray-700">
                                    <li>Detectar e prevenir atividades fraudulentas ou suspeitas</li>
                                    <li>Proteger contra acessos não autorizados</li>
                                    <li>Monitorar e auditar logs de sistema</li>
                                    <li>Garantir a integridade e disponibilidade da plataforma</li>
                                </ul>
                            </div>

                            <div className="bg-yellow-50 p-5 rounded-lg border border-yellow-200">
                                <h4 className="font-bold text-yellow-900 text-lg mb-2">📧 Comunicação e Suporte (Art. 7º, V e I - LGPD)</h4>
                                <p className="text-gray-700 mb-2"><strong>Base Legal:</strong> Execução de contrato e consentimento</p>
                                <ul className="text-gray-700">
                                    <li>Responder solicitações de suporte técnico</li>
                                    <li>Enviar notificações importantes sobre o serviço</li>
                                    <li>Informar sobre atualizações e manutenções programadas</li>
                                    <li>Enviar comunicações promocionais (com possibilidade de opt-out)</li>
                                </ul>
                            </div>

                            <div className="bg-red-50 p-5 rounded-lg border border-red-200">
                                <h4 className="font-bold text-red-900 text-lg mb-2">⚖️ Cumprimento de Obrigações Legais (Art. 7º, II - LGPD)</h4>
                                <p className="text-gray-700 mb-2"><strong>Base Legal:</strong> Obrigação legal ou regulatória</p>
                                <ul className="text-gray-700">
                                    <li>Atender requisições de autoridades competentes</li>
                                    <li>Cumprir ordens judiciais e obrigações fiscais</li>
                                    <li>Exercer direitos em processos judiciais ou administrativos</li>
                                </ul>
                            </div>
                        </div>

                        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">4. Compartilhamento de Dados</h2>

                        <div className="bg-red-50 border-l-4 border-red-600 p-5 rounded-r-lg mb-6">
                            <p className="text-lg font-bold text-red-900 m-0">
                                ⚠️ O Dá-lhe Med NÃO vende, aluga, comercializa ou compartilha seus dados pessoais para fins publicitários com terceiros.
                            </p>
                        </div>

                        <p className="text-gray-700 mb-4">
                            Compartilhamos seus dados apenas nas seguintes situações estritamente necessárias:
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.1. Provedores de Serviços Essenciais</h3>
                        <p className="text-gray-700 mb-4">
                            Contratamos empresas terceirizadas confiáveis para nos auxiliar na operação da plataforma. Esses prestadores atuam como <strong>operadores de dados</strong> sob nossas instruções e estão contratualmente obrigados a proteger suas informações:
                        </p>

                        <div className="ml-4 space-y-3">
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <p className="font-semibold text-gray-800">🗄️ Infraestrutura e Hospedagem:</p>
                                <p className="text-gray-700 text-sm mt-1">Supabase, Google Cloud Platform - para armazenamento de dados e hospedagem da aplicação.</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <p className="font-semibold text-gray-800">🔐 Autenticação:</p>
                                <p className="text-gray-700 text-sm mt-1">Google LLC - para serviços de login via OAuth.</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <p className="font-semibold text-gray-800">🤖 Inteligência Artificial:</p>
                                <p className="text-gray-700 text-sm mt-1">Google (Gemini), OpenAI ou similares - para processamento de conteúdo e geração de material educacional.</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <p className="font-semibold text-gray-800">📊 Análise e Monitoramento:</p>
                                <p className="text-gray-700 text-sm mt-1">Google Analytics, Hotjar ou similares - para análise de uso agregado e melhoria da experiência (dados anonimizados).</p>
                            </div>
                        </div>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.2. Requisitos Legais</h3>
                        <p className="text-gray-700">
                            Podemos divulgar seus dados quando exigido por lei, regulamentação, processo judicial, ordem de autoridade competente, ou quando necessário para proteger nossos direitos legais, sua segurança ou a de terceiros.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.3. Transferências Empresariais</h3>
                        <p className="text-gray-700">
                            Em caso de fusão, aquisição, venda de ativos ou reestruturação empresarial, seus dados poderão ser transferidos, desde que o adquirente se comprometa a respeitar esta Política de Privacidade.
                        </p>

                        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">5. Armazenamento e Segurança de Dados</h2>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">5.1. Medidas de Segurança Implementadas</h3>
                        <p className="text-gray-700 mb-4">
                            Adotamos medidas técnicas e organizacionais robustas para proteger seus dados contra acesso não autorizado, perda, destruição ou alteração:
                        </p>

                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <p className="font-semibold text-blue-900 mb-2">🔐 Criptografia</p>
                                <ul className="text-sm text-gray-700">
                                    <li>SSL/TLS em todas as transmissões de dados</li>
                                    <li>Criptografia de dados sensíveis em repouso</li>
                                    <li>Hash seguro de senhas (bcrypt, Argon2)</li>
                                </ul>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <p className="font-semibold text-green-900 mb-2">🛡️ Controle de Acesso</p>
                                <ul className="text-sm text-gray-700">
                                    <li>Autenticação multifator para administradores</li>
                                    <li>Princípio do menor privilégio</li>
                                    <li>Logs de auditoria de acessos</li>
                                </ul>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                <p className="font-semibold text-purple-900 mb-2">🔍 Monitoramento</p>
                                <ul className="text-sm text-gray-700">
                                    <li>Detecção de atividades suspeitas</li>
                                    <li>Sistemas de prevenção de intrusão</li>
                                    <li>Monitoramento contínuo de vulnerabilidades</li>
                                </ul>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                <p className="font-semibold text-orange-900 mb-2">💾 Backup e Recuperação</p>
                                <ul className="text-sm text-gray-700">
                                    <li>Backups regulares automatizados</li>
                                    <li>Armazenamento redundante de dados</li>
                                    <li>Plano de recuperação de desastres</li>
                                </ul>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border-l-4 border-yellow-600 p-5 rounded-r-lg mb-6">
                            <p className="text-gray-700 m-0">
                                <strong>Importante:</strong> Nenhum sistema é 100% seguro. Embora implementemos as melhores práticas de segurança, não podemos garantir segurança absoluta. Você também é responsável por manter a confidencialidade de suas credenciais de acesso.
                            </p>
                        </div>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">5.2. Transferência Internacional de Dados</h3>
                        <p className="text-gray-700 mb-4">
                            Nossos servidores e provedores de infraestrutura podem estar localizados fora do Brasil, incluindo nos Estados Unidos e Europa. Ao utilizar nossos serviços, você consente com essa transferência internacional de dados.
                        </p>
                        <p className="text-gray-700">
                            Garantimos que todos os parceiros internacionais adotam níveis adequados de proteção de dados compatíveis com a LGPD, incluindo cláusulas contratuais padrão, certificações de privacidade e outras salvaguardas apropriadas.
                        </p>

                        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">6. Retenção de Dados</h2>

                        <p className="text-gray-700 mb-4">
                            Mantemos seus dados pessoais apenas pelo tempo necessário para cumprir as finalidades descritas nesta política, respeitando os seguintes critérios:
                        </p>

                        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mb-6">
                            <ul className="space-y-3 m-0">
                                <li><strong>Dados de cadastro e perfil:</strong> Enquanto sua conta estiver ativa, mais o prazo legal de prescrição (até 10 anos para fins fiscais e contábeis).</li>
                                <li><strong>Conteúdo educacional:</strong> Enquanto sua conta estiver ativa ou conforme configurações de retenção que você definir.</li>
                                <li><strong>Dados de desempenho acadêmico:</strong> Enquanto sua conta estiver ativa para garantir continuidade do aprendizado.</li>
                                <li><strong>Logs de sistema:</strong> Até 6 meses para fins de segurança e auditoria.</li>
                                <li><strong>Dados de comunicação:</strong> Até 5 anos para comprovar atendimento e resolver disputas.</li>
                            </ul>
                        </div>

                        <p className="text-gray-700">
                            Após a exclusão de sua conta ou término do prazo de retenção, seus dados pessoais serão permanentemente eliminados ou anonimizados, exceto quando a legislação exigir sua conservação por prazo superior.
                        </p>

                        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">7. Seus Direitos como Titular de Dados (LGPD)</h2>

                        <p className="text-gray-700 mb-6">
                            De acordo com a LGPD, você possui os seguintes direitos em relação aos seus dados pessoais:
                        </p>

                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                            <div className="bg-blue-50 p-5 rounded-lg border-l-4 border-blue-600">
                                <h4 className="font-bold text-blue-900 mb-2">📋 Confirmação e Acesso</h4>
                                <p className="text-sm text-gray-700">Confirmar se tratamos seus dados e solicitar acesso a eles, com possibilidade de obter uma cópia em formato estruturado.</p>
                            </div>
                            <div className="bg-green-50 p-5 rounded-lg border-l-4 border-green-600">
                                <h4 className="font-bold text-green-900 mb-2">✏️ Correção</h4>
                                <p className="text-sm text-gray-700">Solicitar a correção de dados incompletos, inexatos ou desatualizados.</p>
                            </div>
                            <div className="bg-purple-50 p-5 rounded-lg border-l-4 border-purple-600">
                                <h4 className="font-bold text-purple-900 mb-2">🔒 Anonimização e Bloqueio</h4>
                                <p className="text-sm text-gray-700">Requerer anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade.</p>
                            </div>
                            <div className="bg-red-50 p-5 rounded-lg border-l-4 border-red-600">
                                <h4 className="font-bold text-red-900 mb-2">🗑️ Eliminação</h4>
                                <p className="text-sm text-gray-700">Solicitar a exclusão de dados tratados com seu consentimento, salvo hipóteses legais de conservação.</p>
                            </div>
                            <div className="bg-orange-50 p-5 rounded-lg border-l-4 border-orange-600">
                                <h4 className="font-bold text-orange-900 mb-2">📤 Portabilidade</h4>
                                <p className="text-sm text-gray-700">Solicitar a portabilidade de seus dados a outro fornecedor de serviço, mediante requisição expressa.</p>
                            </div>
                            <div className="bg-yellow-50 p-5 rounded-lg border-l-4 border-yellow-600">
                                <h4 className="font-bold text-yellow-900 mb-2">ℹ️ Informação sobre Compartilhamento</h4>
                                <p className="text-sm text-gray-700">Obter informação sobre as entidades públicas e privadas com as quais compartilhamos seus dados.</p>
                            </div>
                            <div className="bg-pink-50 p-5 rounded-lg border-l-4 border-pink-600">
                                <h4 className="font-bold text-pink-900 mb-2">🚫 Revogação do Consentimento</h4>
                                <p className="text-sm text-gray-700">Retirar seu consentimento a qualquer momento, mediante manifestação expressa.</p>
                            </div>
                            <div className="bg-indigo-50 p-5 rounded-lg border-l-4 border-indigo-600">
                                <h4 className="font-bold text-indigo-900 mb-2">⚖️ Oposição</h4>
                                <p className="text-sm text-gray-700">Opor-se a tratamento realizado com dispensa de consentimento, em desconformidade com a lei.</p>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                            <h4 className="font-bold text-blue-900 text-lg mb-3">Como Exercer Seus Direitos</h4>
                            <p className="text-gray-700 mb-3">
                                Para exercer qualquer um desses direitos, você pode:
                            </p>
                            <ul className="text-gray-700 space-y-2">
                                <li>✉️ Enviar e-mail para: <strong>projetosmeddrive@gmail.com</strong></li>
                                <li>⚙️ Acessar as configurações da sua conta na plataforma</li>
                                <li>💬 Entrar em contato com nosso suporte através do chat ou formulário de contato</li>
                            </ul>
                            <p className="text-sm text-gray-500 mt-4">
                                Responderemos às suas solicitações em até 15 dias, conforme previsto na LGPD.
                            </p>
                        </div>
                    </article>
                </div>
            </div>
        </div>
    );
}