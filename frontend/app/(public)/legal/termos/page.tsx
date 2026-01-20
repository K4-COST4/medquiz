import { BackButton } from '@/components/ui/back-button';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                <BackButton />
                <div className="bg-white p-8 sm:p-12 shadow-lg rounded-2xl border border-gray-200">
                    <article className="prose prose-slate lg:prose-lg mx-auto">
                        <div className="text-center mb-8 pb-6 border-b-2 border-green-600">
                            <h1 className="text-4xl font-bold text-gray-900 mb-3">Termos de Uso</h1>
                            <p className="text-lg font-semibold text-green-600">Dá-lhe Med</p>
                            <p className="text-sm text-gray-600 mt-2">
                                <strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}
                            </p>
                        </div>

                        <div className="bg-green-50 border-l-4 border-green-600 p-5 rounded-r-lg mb-8">
                            <p className="text-base leading-relaxed m-0">
                                Bem-vindo ao <strong>Dá-lhe Med</strong>! Estes Termos de Uso ("Termos") regem o acesso e utilização de nossa plataforma educacional de medicina. Ao criar uma conta, acessar ou utilizar nossos serviços, você concorda integral e incondicionalmente com todos os termos aqui estabelecidos.
                            </p>
                        </div>

                        <div className="bg-red-50 border-l-4 border-red-600 p-5 rounded-r-lg mb-8">
                            <p className="font-bold text-red-900 text-lg mb-2">⚠️ LEIA ATENTAMENTE</p>
                            <p className="text-gray-700 m-0">
                                Se você NÃO concordar com qualquer disposição destes Termos, NÃO utilize a plataforma Dá-lhe Med. O uso continuado de nossos serviços constitui aceitação plena e irrevogável destes Termos e de nossa Política de Privacidade.
                            </p>
                        </div>

                        <hr className="my-10 border-gray-300" />

                        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">1. Definições</h2>

                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
                            <p className="text-gray-700 mb-4">Para os fins destes Termos, considera-se:</p>
                            <ul className="space-y-2 m-0">
                                <li><strong>"Plataforma" ou "Dá-lhe Med":</strong> O site, aplicativo móvel e todos os serviços oferecidos.</li>
                                <li><strong>"Usuário" ou "Você":</strong> Qualquer pessoa que acesse ou utilize a Plataforma.</li>
                                <li><strong>"Conteúdo do Usuário":</strong> Textos, arquivos, flashcards, anotações e qualquer material enviado por você.</li>
                                <li><strong>"Conteúdo da Plataforma":</strong> Quizzes, questões, interface, algoritmos e demais materiais criados pelo Dá-lhe Med.</li>
                                <li><strong>"Serviços":</strong> Quizzes, flashcards, geração de conteúdo via IA, trilhas de aprendizado e demais funcionalidades.</li>
                            </ul>
                        </div>

                        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">2. Natureza Educacional e Isenção de Responsabilidade Médica</h2>

                        <div className="bg-yellow-50 border-l-4 border-yellow-600 p-6 rounded-r-lg mb-6">
                            <p className="font-bold text-yellow-900 text-xl mb-3">⚕️ AVISO MÉDICO FUNDAMENTAL</p>
                            <p className="text-gray-700 leading-relaxed">
                                O Dá-lhe Med é uma ferramenta <strong>estritamente educacional</strong> destinada exclusivamente a estudantes de medicina, residentes e profissionais de saúde para fins de estudo, revisão e aperfeiçoamento de conhecimentos teóricos.
                            </p>
                        </div>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">2.1. O que a Plataforma NÃO É</h3>

                        <div className="space-y-4 ml-4">
                            <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                                <p className="font-semibold text-red-900 mb-2">🚫 NÃO é dispositivo médico ou ferramenta diagnóstica</p>
                                <p className="text-sm text-gray-700">A Plataforma não constitui, substitui ou se destina a ser utilizada como ferramenta de diagnóstico médico, prescrição de tratamentos ou aconselhamento clínico.</p>
                            </div>

                            <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                                <p className="font-semibold text-red-900 mb-2">🚫 NÃO substitui consultas médicas</p>
                                <p className="text-sm text-gray-700">As informações fornecidas não substituem a avaliação, diagnóstico ou tratamento por profissional de saúde qualificado e devidamente habilitado.</p>
                            </div>

                            <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                                <p className="font-semibold text-red-900 mb-2">🚫 NÃO garante aprovação em exames</p>
                                <p className="text-sm text-gray-700">Embora seja uma ferramenta de auxílio ao estudo, o Dá-lhe Med não garante aprovação em provas, concursos, residências médicas ou qualquer avaliação acadêmica ou profissional.</p>
                            </div>

                            <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                                <p className="font-semibold text-red-900 mb-2">🚫 NÃO fornece orientação para casos reais</p>
                                <p className="text-sm text-gray-700">NUNCA utilize as informações da Plataforma para tomar decisões clínicas sobre pacientes reais. Em caso de dúvidas sobre situações clínicas reais, sempre consulte protocolos oficiais, literatura médica atualizada e profissionais experientes.</p>
                            </div>
                        </div>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">2.2. Limitações da Inteligência Artificial</h3>

                        <div className="bg-orange-50 p-5 rounded-lg border border-orange-200 mb-6">
                            <p className="text-gray-700 mb-3">
                                O conteúdo gerado por Inteligência Artificial (IA) está sujeito às seguintes limitações:
                            </p>
                            <ul className="space-y-2 text-gray-700">
                                <li><strong>Alucinações:</strong> Modelos de linguagem podem gerar informações factualmente incorretas ou inventadas ("alucinações").</li>
                                <li><strong>Desatualização:</strong> A IA pode não refletir as diretrizes médicas mais recentes ou mudanças em protocolos clínicos.</li>
                                <li><strong>Falta de contexto clínico:</strong> A IA não possui experiência clínica real nem capacidade de avaliar nuances de casos individuais.</li>
                                <li><strong>Viés algorítmico:</strong> Podem existir vieses nos dados de treinamento que impactam as respostas geradas.</li>
                            </ul>
                            <p className="text-sm text-gray-600 mt-4 italic font-semibold">
                                É RESPONSABILIDADE DO USUÁRIO verificar todas as informações geradas pela IA com fontes confiáveis, diretrizes oficiais (UpToDate, Dynamed, protocolos ministeriais) e literatura médica revisada por pares.
                            </p>
                        </div>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">2.3. Responsabilidade do Usuário</h3>

                        <p className="text-gray-700 mb-4">Ao utilizar a Plataforma, você reconhece e concorda que:</p>
                        <ul className="text-gray-700 space-y-2">
                            <li>Você é o único responsável por verificar a precisão e atualidade das informações estudadas.</li>
                            <li>Decisões clínicas sobre pacientes reais devem ser baseadas em avaliação médica adequada, evidências científicas sólidas e diretrizes oficiais.</li>
                            <li>Em caso de emergência médica, você deve procurar imediatamente atendimento profissional especializado.</li>
                            <li>O Dá-lhe Med não se responsabiliza por quaisquer consequências decorrentes da aplicação inadequada ou interpretação errônea do conteúdo educacional.</li>
                        </ul>

                        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">3. Elegibilidade e Cadastro</h2>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">3.1. Requisitos para Uso</h3>
                        <p className="text-gray-700 mb-4">Para utilizar a Plataforma, você deve:</p>
                        <ul className="text-gray-700 space-y-2">
                            <li>Ter pelo menos 18 (dezoito) anos de idade ou ser emancipado legalmente.</li>
                            <li>Se menor de 18 anos, possuir autorização expressa de pais ou responsáveis legais.</li>
                            <li>Possuir capacidade legal para celebrar contratos vinculantes.</li>
                            <li>Fornecer informações verdadeiras, precisas e atualizadas durante o cadastro.</li>
                            <li>Ser estudante de medicina, profissional de saúde ou ter interesse legítimo em educação médica.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">3.2. Conta de Usuário</h3>
                        <div className="bg-blue-50 p-5 rounded-lg border border-blue-200 mb-6">
                            <p className="text-gray-700 mb-3"><strong>Você é responsável por:</strong></p>
                            <ul className="text-gray-700 space-y-2">
                                <li>✓ Manter a confidencialidade de suas credenciais de acesso (login e senha).</li>
                                <li>✓ Todas as atividades realizadas sob sua conta.</li>
                                <li>✓ Notificar imediatamente o Dá-lhe Med sobre qualquer uso não autorizado de sua conta.</li>
                                <li>✓ Fazer logout ao encerrar sessões em dispositivos compartilhados.</li>
                                <li>✓ Manter seus dados cadastrais atualizados.</li>
                            </ul>
                            <p className="text-sm text-gray-600 mt-3 font-semibold">
                                O compartilhamento de contas é estritamente PROIBIDO e pode resultar no cancelamento imediato de seu acesso.
                            </p>
                        </div>

                        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">4. Uso Aceitável da Plataforma</h2>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">4.1. Condutas Permitidas</h3>
                        <div className="bg-green-50 p-5 rounded-lg border border-green-200 mb-6">
                            <p className="text-gray-700 mb-2">Você PODE:</p>
                            <ul className="text-gray-700 space-y-1">
                                <li>✓ Utilizar a Plataforma para fins educacionais pessoais e não comerciais.</li>
                                <li>✓ Criar flashcards, responder quizzes e acompanhar seu progresso.</li>
                                <li>✓ Enviar conteúdo educacional (textos, PDFs) para geração de material de estudo.</li>
                                <li>✓ Exportar seus dados pessoais conforme a LGPD.</li>
                                <li>✓ Fornecer feedback para melhoria da Plataforma.</li>
                            </ul>
                        </div>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">4.2. Condutas Proibidas</h3>
                        <div className="bg-red-50 p-5 rounded-lg border border-red-200 mb-6">
                            <p className="text-gray-700 mb-3 font-semibold">Você NÃO PODE, sob pena de suspensão ou cancelamento imediato:</p>

                            <div className="space-y-4">
                                <div>
                                    <p className="font-semibold text-red-900 mb-1">🚫 Violação de Sigilo Médico e Privacidade</p>
                                    <ul className="text-sm text-gray-700 ml-4">
                                        <li>Inserir dados reais de pacientes que possam identificá-los (nome, CPF, prontuário, dados sensíveis).</li>
                                        <li>Compartilhar informações protegidas por sigilo médico ou profissional.</li>
                                        <li>Violar a LGPD ou legislação de proteção de dados.</li>
                                    </ul>
                                </div>

                                <div>
                                    <p className="font-semibold text-red-900 mb-1">🚫 Atividades Ilegais ou Prejudiciais</p>
                                    <ul className="text-sm text-gray-700 ml-4">
                                        <li>Utilizar a Plataforma para atividades ilegais, fraudulentas ou antiéticas.</li>
                                        <li>Disseminar conteúdo ilegal, difamatório, obsceno, discriminatório ou ofensivo.</li>
                                        <li>Promover discurso de ódio, violência, terrorismo ou condutas que violem direitos humanos.</li>
                                        <li>Assediar, ameaçar ou intimidar outros usuários ou terceiros.</li>
                                    </ul>
                                </div>

                                <div>
                                    <p className="font-semibold text-red-900 mb-1">🚫 Violação de Propriedade Intelectual</p>
                                    <ul className="text-sm text-gray-700 ml-4">
                                        <li>Copiar, reproduzir, distribuir ou modificar o conteúdo da Plataforma sem autorização.</li>
                                        <li>Fazer engenharia reversa, descompilar ou tentar extrair o código-fonte.</li>
                                        <li>Remover marcas d'água, avisos de direitos autorais ou outras notações de propriedade.</li>
                                        <li>Criar obras derivadas baseadas na Plataforma sem permissão expressa.</li>
                                    </ul>
                                </div>

                                <div>
                                    <p className="font-semibold text-red-900 mb-1">🚫 Abuso Técnico e de Segurança</p>
                                    <ul className="text-sm text-gray-700 ml-4">
                                        <li>Tentar acessar áreas restritas ou contas de outros usuários.</li>
                                        <li>Realizar ataques de negação de serviço (DDoS), injeção de código ou explorar vulnerabilidades.</li>
                                        <li>Utilizar bots, scrapers, scripts automatizados ou qualquer ferramenta de extração de dados não autorizada.</li>
                                        <li>Sobrecarregar intencionalmente os servidores ou comprometer a infraestrutura.</li>
                                        <li>Transmitir vírus, malware ou qualquer código malicioso.</li>
                                    </ul>
                                </div>

                                <div>
                                    <p className="font-semibold text-red-900 mb-1">🚫 Uso Comercial Não Autorizado</p>
                                    <ul className="text-sm text-gray-700 ml-4">
                                        <li>Revender, licenciar ou comercializar acesso à Plataforma.</li>
                                        <li>Utilizar a Plataforma para fins comerciais sem autorização escrita.</li>
                                        <li>Criar serviços concorrentes baseados em nosso conteúdo ou tecnologia.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">5. Propriedade Intelectual</h2>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">5.1. Propriedade do Dá-lhe Med</h3>
                        <div className="bg-purple-50 p-5 rounded-lg border border-purple-200 mb-6">
                            <p className="text-gray-700 mb-3">
                                Todos os direitos de propriedade intelectual sobre a Plataforma são de propriedade exclusiva do Dá-lhe Med, incluindo mas não se limitando a:
                            </p>
                            <ul className="text-gray-700 space-y-1">
                                <li>• Código-fonte, arquitetura de software e algoritmos</li>
                                <li>• Interface gráfica, design e identidade visual</li>
                                <li>• Banco de questões, quizzes e trilhas de aprendizado</li>
                                <li>• Marca "Dá-lhe Med", logotipos e elementos de branding</li>
                                <li>• Sistema de gamificação e funcionalidades exclusivas</li>
                                <li>• Metodologias proprietárias de ensino e algoritmos de repetição espaçada</li>
                            </ul>
                            <p className="text-sm text-gray-600 mt-3 font-semibold">
                                Nenhuma parte destes Termos transfere a você qualquer direito de propriedade sobre esses elementos.
                            </p>
                        </div>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">5.2. Conteúdo do Usuário</h3>
                        <p className="text-gray-700 mb-4">
                            O conteúdo que você cria ou envia para a Plataforma (seus flashcards pessoais, anotações, textos enviados) permanece de sua propriedade. No entanto, ao enviar conteúdo, você concede ao Dá-lhe Med uma:
                        </p>
                        <div className="bg-blue-50 p-5 rounded-lg border border-blue-200 mb-6">
                            <p className="font-semibold text-blue-900 mb-2">Licença mundial, não exclusiva, livre de royalties, transferível e sublicenciável para:</p>
                            <ul className="text-gray-700 space-y-1 text-sm">
                                <li>✓ Armazenar, processar e exibir seu conteúdo para prestação dos serviços</li>
                                <li>✓ Processar seu conteúdo via APIs de IA para gerar flashcards, resumos e questões</li>
                                <li>✓ Realizar backups e garantir a continuidade dos serviços</li>
                                <li>✓ Utilizar dados agregados e anonimizados para melhoria da Plataforma</li>
                            </ul>
                            <p className="text-sm text-gray-600 mt-3">
                                <strong>Importante:</strong> Não utilizaremos seu conteúdo pessoal de forma pública ou comercial sem sua autorização expressa. A licença acima é estritamente necessária para operação da Plataforma.
                            </p>
                        </div>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">5.3. Garantias sobre Conteúdo Enviado</h3>
                        <p className="text-gray-700 mb-3">Ao enviar conteúdo, você declara e garante que:</p>
                        <ul className="text-gray-700 space-y-1">
                            <li>• Possui todos os direitos necessários sobre o conteúdo enviado</li>
                            <li>• O conteúdo não viola direitos autorais, marcas ou propriedade intelectual de terceiros</li>
                            <li>• O conteúdo não contém dados pessoais de pacientes ou informações confidenciais</li>
                            <li>• O conteúdo está em conformidade com todas as leis aplicáveis</li>
                        </ul>

                        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">6. Planos, Pagamentos e Cancelamento (Atualmente Não Aplicável)</h2>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">6.1. Modalidades de Acesso</h3>
                        <p className="text-gray-700 mb-4">A Plataforma pode oferecer diferentes modalidades de acesso:</p>
                        <ul className="text-gray-700 space-y-2">
                            <li><strong>Plano Gratuito:</strong> Acesso limitado a funcionalidades básicas, podendo conter restrições de uso.</li>
                            <li><strong>Planos Pagos (Premium):</strong> Acesso completo ou ampliado mediante pagamento de assinatura mensal, semestral ou anual.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">6.2. Cobrança e Renovação</h3>
                        <div className="bg-yellow-50 p-5 rounded-lg border border-yellow-200 mb-6">
                            <ul className="text-gray-700 space-y-2 m-0">
                                <li>• As assinaturas são renovadas automaticamente ao final de cada período, exceto se canceladas.</li>
                                <li>• Os valores são cobrados antecipadamente no início de cada ciclo de faturamento.</li>
                                <li>• Você será notificado sobre renovações e alterações de preço com antecedência mínima de 7 (sete) dias.</li>
                                <li>• Os pagamentos são processados por terceiros (Stripe, Mercado Pago) e estão sujeitos aos termos desses serviços.</li>
                                <li>• Impostos aplicáveis serão adicionados ao valor da assinatura conforme legislação vigente.</li>
                            </ul>
                        </div>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">6.3. Cancelamento e Reembolso</h3>
                        <p className="text-gray-700 mb-3"><strong>Cancelamento pelo Usuário:</strong></p>
                        <ul className="text-gray-700 space-y-1 mb-4">
                            <li>• Você pode cancelar sua assinatura a qualquer momento através das configurações da conta.</li>
                            <li>• O cancelamento terá efeito ao final do período de faturamento já pago.</li>
                            <li>• Não há reembolso proporcional de valores já pagos, exceto em casos previstos no Código de Defesa do Consumidor.</li>
                            <li>• Você manterá acesso aos recursos pagos até o final do período contratado.</li>
                        </ul>

                        <p className="text-gray-700 mb-3"><strong>Direito de Arrependimento (CDC):</strong></p>
                        <p className="text-gray-700 mb-4">
                            Conforme o Art. 49 do Código de Defesa do Consumidor, você tem direito de desistir da contratação no prazo de 7 (sete) dias corridos a contar da data da contratação ou do recebimento do produto/serviço, com reembolso integral dos valores pagos, desde que não tenha utilizado significativamente os serviços neste período.
                        </p>

                        <p className="text-gray-700 mb-3"><strong>Cancelamento pelo Dá-lhe Med:</strong></p>
                        <p className="text-gray-700">
                            Reservamo-nos o direito de suspender ou cancelar sua conta, com ou sem aviso prévio, em caso de violação destes Termos, uso inadequado, fraude, ou por qualquer outro motivo legítimo, sem direito a reembolso.
                        </p>

                        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">7. Limitação de Responsabilidade</h2>

                        <div className="bg-red-50 border-2 border-red-300 p-6 rounded-lg mb-6">
                            <p className="font-bold text-red-900 text-xl mb-4">⚠️ LIMITAÇÕES IMPORTANTES</p>

                            <h4 className="font-semibold text-gray-800 mb-2">7.1. Fornecimento "Como Está"</h4>
                            <p className="text-gray-700 mb-4">
                                A Plataforma é fornecida <strong>"COMO ESTÁ"</strong> e <strong>"CONFORME DISPONÍVEL"</strong>, sem garantias de qualquer tipo, expressas ou implícitas, incluindo, mas não se limitando a:
                            </p>
                            <ul className="text-gray-700 space-y-1 mb-4 text-sm">
                                <li>• Garantias de comercialização ou adequação a um fim específico</li>
                                <li>• Garantias de precisão, completude ou atualidade do conteúdo</li>
                                <li>• Garantias de funcionamento ininterrupto ou livre de erros</li>
                                <li>• Garantias de segurança absoluta contra ataques ou invasões</li>
                                <li>• Garantias de aprovação em exames ou resultados acadêmicos</li>
                            </ul>

                            <h4 className="font-semibold text-gray-800 mb-2 mt-4">7.2. Exclusão de Responsabilidade por Danos</h4>
                            <p className="text-gray-700 mb-3">
                                NA MÁXIMA EXTENSÃO PERMITIDA PELA LEI, o Dá-lhe Med, seus administradores, funcionários, parceiros e fornecedores NÃO SERÃO RESPONSÁVEIS POR:
                            </p>
                            <ul className="text-gray-700 space-y-1 text-sm">
                                <li>• Danos diretos, indiretos, incidentais, especiais, consequenciais ou punitivos</li>
                                <li>• Perda de lucros, receitas, dados, oportunidades ou goodwill</li>
                                <li>• Interrupção de negócios ou estudos</li>
                                <li>• Decisões clínicas baseadas no conteúdo da Plataforma</li>
                                <li>• Reprovação em exames, concursos ou avaliações acadêmicas</li>
                                <li>• Erros, imprecisões ou desatualizações no conteúdo gerado por IA</li>
                                <li>• Falhas técnicas, perda de dados ou indisponibilidade temporária dos serviços</li>
                                <li>• Ações de terceiros, incluindo hackers, vírus ou ataques cibernéticos</li>
                                <li>• Conteúdo ou condutas de outros usuários</li>
                            </ul>

                            <p className="text-sm text-gray-600 mt-4 font-semibold italic">
                                Esta limitação se aplica mesmo que o Dá-lhe Med tenha sido avisado da possibilidade de tais danos. Algumas jurisdições não permitem exclusão ou limitação de danos incidentais ou consequenciais, portanto as limitações acima podem não se aplicar integralmente a você.
                            </p>
                        </div>

                        <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">7.3. Limite Máximo de Responsabilidade</h3>
                        <p className="text-gray-700">
                            Em qualquer caso, a responsabilidade total agregada do Dá-lhe Med perante você por todos os danos, perdas e causas de pedir (seja em contrato, ato ilícito, incluindo negligência, ou outro) não excederá o valor total pago por você à Plataforma nos 12 (doze) meses anteriores à reclamação, ou R$ 100,00 (cem reais), o que for menor.
                        </p>

                        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">8. Disposições Gerais</h2>

                        <ul className="text-gray-700 space-y-4">
                            <li>
                                <strong>Acordo Integral:</strong> Estes Termos constituem o acordo integral entre você e o Dá-lhe Med, substituindo quaisquer acordos anteriores.
                            </li>
                            <li>
                                <strong>Independência das Cláusulas:</strong> Se qualquer disposição destes Termos for considerada inválida ou inexequível, as demais disposições permanecerão em pleno vigor e efeito.
                            </li>
                            <li>
                                <strong>Renúncia:</strong> O não exercício de qualquer direito por parte do Dá-lhe Med não constituirá renúncia a tal direito.
                            </li>
                            <li>
                                <strong>Lei Aplicável e Foro:</strong> Estes Termos serão regidos e interpretados de acordo com as leis da República Federativa do Brasil. Fica eleito o foro da comarca de Araguaína-TO, sede do Dá-lhe Med, para dirimir quaisquer litígios, com exclusão de qualquer outro.
                            </li>
                        </ul>

                        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6">9. Contato</h2>
                        <p className="text-gray-700 mb-4">
                            Se você tiver dúvidas sobre estes Termos de Uso, entre em contato conosco:
                        </p>
                        <div className="bg-gray-100 p-4 rounded-lg not-prose border border-gray-200">
                            <p className="font-semibold text-gray-800">Equipe Jurídica Dá-lhe Med</p>
                            <p className="text-gray-600">E-mail: <a href="mailto:projetosmeddrive@gmail.com" className="text-blue-600 hover:underline">projetosmeddrive@gmail.com</a></p>
                        </div>

                    </article>
                </div>
            </div>
        </div>
    );
}