import asyncio
from database import supabase

# ==============================================================================
# 📚 O CURRÍCULO MÉDICO (Aqui você define a estrutura do seu App)
# ==============================================================================
# ==============================================================================
# 📚 O CURRÍCULO MÉDICO - ESTRUTURA BASE (SKELETON)
# ==============================================================================
# Estratégia: 
# 1. Área Única: Ciências Básicas
# 2. Sistemas: 10 sistemas solicitados
# 3. Trilhas Padrão: Anatomia, Histologia, Fisiologia, Semiologia
# ==============================================================================

CURRICULO_MEDICINA = [
    {
        "area": "Ciências Básicas",
        "sistemas": [
            {
                "nome": "Cardiovascular", # Ajustado de 'Cardíaco' para englobar vasos
                "trilhas": [
                    {"nome": "Anatomia", 
                     "ilhas": [
                         "Mediastino: Divisões, Limites e Conteúdo",
                         "Pericárdio: Camadas (Fibroso e Seroso), Seios e Inervação",
                         "Morfologia Externa do Coração: Faces, Margens e Sulcos",
                         "Átrio Direito: Aurícula, Músculos Pectíneos e Fossa Oval",
                         "Ventrículo Direito: Trabéculas Cárneas, Cone Arterial e Músculos Papilares",
                         "Átrio Esquerdo e Ventrículo Esquerdo: Diferenças de Espessura e Estrutura",
                         "Esqueleto Fibroso do Coração: Anéis Valvares e Trígonos",
                         "Valvas Atrioventriculares (Tricúspide e Mitral): Complexo Valvar e Mecanismo",
                         "Valvas Semilunares (Aórtica e Pulmonar): Nódulos e Lúnulas",
                         "Circulação Coronariana Arterial: Coronária Direita (CD) e Ramos",
                         "Circulação Coronariana Arterial: Coronária Esquerda (TCE) e Ramos",
                         "Drenagem Venosa Cardíaca: Seio Coronário e Veias Cardíacas",
                         "Sistema de Condução: Localização Anatômica (Nó SA, AV, Feixe de His e Purkinje)",
                         "Inervação Extrínseca: Plexo Cardíaco (Simpático e Vago)",
                         "Grandes Vasos da Base: Aorta Ascendente, Tronco Pulmonar e Veias Cavas",
                     ]},
                    {"nome": "Histologia", "ilhas": [
                        "Parede do Coração: Endocárdio (Endotélio e Camada Subendocárdica)",
                        "Parede do Coração: Miocárdio e Organização dos Cardiomiócitos",
                        "Parede do Coração: Epicárdio e Pericárdio Visceral",
                        "Ultraestrutura do Músculo Cardíaco: Discos Intercalares, Desmossomos e Junções Comunicantes (Gap)",
                        "Sistema de Condução: Histologia das Células de Purkinje e Nodosais",
                        "Esqueleto Fibroso e Valvas: Tecido Conjuntivo Denso Não Modelado",
                        "Estrutura Geral dos Vasos Sanguíneos: Túnicas Íntima, Média e Adventícia",
                        "Artérias Elásticas (Grande Calibre): Aorta e Lâminas Elásticas Fenestradas",
                        "Artérias Musculares (Médio Calibre) e Arteríolas: Controle da Resistência Periférica",
                        "Capilares Sanguíneos: Tipos (Contínuo, Fenestrado e Sinusoide) e Pericitos",
                        "Vênulas e Veias: Diferenças Histológicas e Válvulas Venosas",
                        "Vasos Linfáticos: Estrutura e Diferenciação dos Capilares Sanguíneos",
                    ]},
                    {"nome": "Fisiologia", "ilhas": [
                            # --- Eletrofisiologia (Baseado em Guyton & Hall) ---
                            "Potenciais de Membrana no Músculo Cardíaco: Fibra de Resposta Rápida",
                            "Potenciais de Ação em Células Marcapasso: Fibra de Resposta Lenta (Nó SA)",
                            "Períodos Refratários: Absoluto e Relativo (Prevenção da Tetania)",
                            "Acoplamento Excitação-Contração: Papel do Cálcio e Túbulos T",
                            "Propagação do Impulso: Atraso Nodal e Ativação Ventricular",
                            
                            # --- Mecânica Cardíaca (A Bomba) ---
                          "Ciclo Cardíaco 1: Sístole (Contração Isovolumétrica e Ejeção)",
                          "Ciclo Cardíaco 2: Diástole (Relaxamento Isovolumétrico e Enchimento)",
                          "Diagrama de Wiggers: Integração Pressão, Volume, ECG e Fonocardiograma",
                          "Débito Cardíaco: Definição e Cálculo (DC = VS x FC)",
                          "Volume Sistólico: Pré-Carga e Lei de Frank-Starling",
                          "Volume Sistólico: Pós-Carga e Contratilidade (Inotropismo)",
                          "Trabalho Cardíaco e Consumo de Oxigênio (MVO2)",
                            
                            # --- Hemodinâmica e Regulação ---
                            "Biofísica da Circulação: Fluxo, Pressão e Resistência (Lei de Ohm)",
                            "Distensibilidade Vascular e Complacência (Veias vs. Artérias)",
                            "Microcirculação: Pressões Hidrostática e Coloidosmótica (Forças de Starling)",
                            "Sistema Linfático: Função no Retorno de Líquidos e Proteínas",
                            "Controle Local do Fluxo Sanguíneo: Teoria Metabólica e Miogênica",
                            "Controle Humoral: Substâncias Vasoconstritoras e Vasodilatadoras",
                            "Regulação Nervosa Rápida: Barorreflexo e Quimiorreflexo",
                            "Regulação da Pressão Arterial a Longo Prazo: Sistema Renal-Líquidos Corporais",
                            "Sistema Renina-Angiotensina-Aldosterona (SRAA) na PA",
                            "Circulação Coronariana: Controle Metabólico e Fluxo Fásico",
                    ]},
                    {"nome": "Semiologia", "ilhas": [
                        # --- Anamnese Dirigida (Sinais e Sintomas - Baseado em Porto) ---
                            "Dor Torácica: Características (Anginosa, Pericárdica, Aórtica)",
                            "Dispneia Cardiogênica: Ortopneia e Dispneia Paroxística Noturna",
                            "Outros Sintomas: Palpitações, Síncope e Edema (Características)",
                            "Classificação Funcional da NYHA (Dispneia)",
                            
                            # --- Exame dos Vasos e Pescoço ---
                            "Pulso Arterial: Frequência, Ritmo e Amplitude (Magnus/Parvus)",
                            "Tipos de Pulso: Paradoxal, Alternante e Bisferiens",
                            "Pressão Venosa Jugular (PVJ): Turgência e Refluxo Hepatojugular",
                            "O Pulso Venoso: Ondas 'a', 'c' e 'v'",
                            
                            # --- Exame do Precórdio (Inspeção e Palpação) ---
                            "Inspeção: Abaulamentos e Retrações Precordiais",
                            "Ictus Cordis: Localização, Extensão e Mobilidade",
                            "Palpação: Impulsões Paraesternais e Frêmito Catário (Thrills)",
                            
                            # --- Ausculta Cardíaca (O "Core") ---
                            "Focos de Ausculta: M, T, A, P e Aórtico Acessório",
                            "Bulhas Normais (B1 e B2): Mecanismo e Hiper/Hipofonese",
                            "Desdobramentos de B2: Fisiológico, Fixo e Paradoxal",
                            "Bulhas Acessórias (B3 e B4) e Ritmos de Galope",
                            "Estalidos de Abertura e Cliques Sistólicos",
                            
                            # --- Sopros (Análise Detalhada) ---
                            "Sopros: Classificação (Levine 1-6), Timbre e Irradiação",
                            "Sopros Sistólicos: Ejeção (Estenose) vs Regurgitação (Insuficiência)",
                            "Sopros Diastólicos e Contínuos",
                            "Manobras Dinâmicas: Rivero-Carvalho, Handgrip e Valsalva"
                    ]}
                ]
            },
                {
                "nome": "Respiratório",
                "trilhas": [
                    {
                        "nome": "Anatomia",
                        "ilhas": [
                            # --- Vias Aéreas Superiores Detalhada (Moore) ---
                            "Nariz Externo e Cavidade Nasal: Cartilagens e Septo",
                            "Parede Lateral do Nariz: Conchas, Meatos e Recessos",
                            "Vascularização do Nariz (Plexo de Kiesselbach)",
                            "Seios Paranasais: Frontal, Maxilar, Etmoidal e Esfenoidal",
                            "Laringe: Cartilagens Impares (Tireoide, Cricoide, Epiglote)",
                            "Laringe: Músculos Intrínsecos (Fonadores e Respiratórios)",
                            "Inervação da Laringe: Laríngeo Recorrente e Superior",
                            
                            # --- Vias Aéreas Inferiores e Topografia ---
                            "Traqueia e Carina: Anatomia e Relações Mediastinais",
                            "Árvore Brônquica: Diferenças entre Brônquio Direito e Esquerdo",
                            "Segmentos Broncopulmonares (Anatomia Cirúrgica)",
                            "Mediastino: Relações Anatômicas dos Pulmões (Impressões)",
                            
                            # --- Pulmões, Pleura e Vascularização ---
                            "Pulmões: Lobos, Fissuras e Língula",
                            "Hilo Pulmonar: Arranjo das Estruturas (V.A.B.)",
                            "Pleura: Parietal (Divisões), Visceral e Ligamento Pulmonar",
                            "Circulação Pulmonar (Funcional) vs. Bronquial (Nutrícia)",
                            "Drenagem Linfática do Tórax e Ducto Torácico",
                            "Diafragma: Hiatos, Pilares e Inervação (Frênico)"
                        ]
                    },
                    {
                        "nome": "Histologia",
                        "ilhas": [
                            # --- Epitélio e Mucosa (Junqueira) ---
                            "Epitélio Respiratório: Tipos Celulares e Cílios",
                            "Lâmina Própria e BALT (Tecido Linfoide Associado aos Brônquios)",
                            "Histologia da Cavidade Nasal e Seios Paranasais",
                            "Epitélio Olfatório e Glândulas de Bowman",
                            
                            # --- A Árvore Brônquica ---
                            "Traqueia e Brônquios: Cartilagem Hialina e Músculo Liso",
                            "Bronquíolos Propriamente Ditos vs. Terminais",
                            "Bronquíolos Respiratórios: Células de Clara (Club Cells) e Transição",
                            "Regulação do Calibre Bronquiolar (Simpático/Parassimpático)",
                            
                            # --- Parênquima Pulmonar ---
                            "Ductos Alveolares, Sacos e Átrios",
                            "Alvéolos: Septo Interalveolar e Poros de Kohn",
                            "Pneumócitos Tipo I (Troca) e Tipo II (Surfactante)",
                            "Macrófagos Alveolares e o Sistema Fagocítico",
                            "Barreira Hematoaérea: As Camadas da Difusão",
                            "Pleura e Mesotélio: Histologia e Produção de Líquido"
                        ]
                    },
                    {
                        "nome": "Fisiologia",
                        "ilhas": [
                            # --- Mecânica da Ventilação (Guyton - Aprofundado) ---
                            "Pressões Respiratórias: Alveolar, Intrapleural e Transpulmonar",
                            "Músculos da Inspiração e Expiração (Repouso vs Forçada)",
                            "Complacência Pulmonar e Torácica: Curvas Pressão-Volume",
                            "Tensão Superficial e o Papel do Surfactante (Lei de Laplace)",
                            "Trabalho da Respiração: Resistivo, Elástico e Tissular",
                            "Volumes e Capacidades Pulmonares (Espirometria)",
                            "Ventilação Minuto vs. Ventilação Alveolar (Espaço Morto)",
                            
                            # --- Circulação Pulmonar e V/Q ---
                            "Resistência Vascular Pulmonar e Recrutamento Capilar",
                            "Zonas de West: Efeito da Gravidade no Fluxo Sanguíneo",
                            "Relação Ventilação-Perfusão (V/Q) e Shunt Fisiológico",
                            "Edema Pulmonar: Fatores de Segurança (Guyton)",
                            
                            # --- Troca e Transporte de Gases ---
                            "Difusão dos Gases: Lei de Fick e Capacidade de Difusão",
                            "Transporte de O2: Hemoglobina e Curva de Dissociação",
                            "Fatores que Desviam a Curva da Hb (Bohr, Temperatura, 2,3-DPG)",
                            "Transporte de CO2: Bicarbonato, Carbamino e Efeito Haldane",
                            
                            # --- Controle da Respiração ---
                            "Centro Respiratório Dorsal (Inspiração) e Ventral (Expiração)",
                            "Centro Pneumotáxico e Apneústico (Ponte)",
                            "Regulação Química: Quimiorreceptores Centrais (CO2/H+) e Periféricos (O2)",
                            "Reflexos: Hering-Breuer, Receptores J e Tosse",
                            "Fisiologia da Aclimatação à Altitude e Hipóxia"
                        ]
                    },
                    {
                        "nome": "Semiologia",
                        "ilhas": [
                            # --- Anamnese Respiratória (Porto - Detalhado) ---
                            "Tosse: Seca, Produtiva, Quintosa e Emetizante",
                            "Expectoração: Mucoide, Purulenta, Herrubinosa e Hemoptise",
                            "Dispneia: Classificação (MRC), Ortopneia e Platipneia",
                            "Dor Torácica Ventilatório-Dependente (Pleurítica)",
                            "Cornagem e Estridor: Obstrução Alta",
                            
                            # --- Inspeção (Estática e Dinâmica) ---
                            "Tipos de Tórax: Tonel, Pectus Excavatum/Carinatum e Cifoescoliose",
                            "Ritmos Respiratórios: Cheyne-Stokes, Biot e Kussmaul",
                            "Sinais de Esforço: Tiragens (Intercostal, Supraclavicular) e Batimento de Asa",
                            "Cianose Central vs. Periférica e Hipocratismo Digital",
                            
                            # --- Palpação e Percussão ---
                            "Expansibilidade Torácica (Manobra de Laségue/Ruault)",
                            "Frêmito Tóraco-Vocal (FTV): Aumento vs. Diminuição",
                            "Desvio da Traqueia e Ictus",
                            "Sons de Percussão: Claro Pulmonar, Macicez, Submacicez e Timpanismo",
                            "Sinal de Skdoda e Espaço de Traube",
                            
                            # --- Ausculta (O Diferencial do Porto) ---
                            "Sons Normais: Murmúrio Vesicular, Broncovesicular e Traqueal",
                            "Sons Descontínuos: Estertores Finos (Velcro) e Grossos (Bolhosos)",
                            "Sons Contínuos: Sibilos (Monofônicos/Polifônicos) e Roncos",
                            "Sons de Origem Pleural: Atrito Pleural",
                            "Ressonância Vocal: Broncoestofonia, Pectorilóquia (Fônica/Áfona) e Egofonia",
                            "Sopro Tubário e Sopro Anfórico"
                        ]
                    }
                ]
            },
            {
                "nome": "Imunológico e Linfático",
                "trilhas": [
                    {
                        "nome": "Anatomia",
                        "ilhas": [
                            # --- Vias e Drenagem (Moore) ---
                            "Capilares, Vasos e Troncos Linfáticos: Estrutura Geral",
                            "Ducto Torácico: Origem (Cisterna do Quilo), Trajeto e Tributárias",
                            "Ducto Linfático Direito e Áreas de Drenagem",
                            "Drenagem Linfática da Cabeça e Pescoço (Colar Pericervical)",
                            "Drenagem da Mama e Axila (Níveis de Berg)",
                            "Drenagem dos Membros Inferiores e Região Inguinal",
                            
                            # --- Órgãos Linfoides ---
                            "Timo: Localização Mediastinal e Involução Etária",
                            "Baço: Faces, Margens, Hilo e Relações Anatômicas",
                            "Anel Linfático de Waldeyer: Tonsilas Palatinas, Faríngea e Linguais"
                        ]
                    },
                    {
                        "nome": "Histologia",
                        "ilhas": [
                            # --- Organização Tecidual (Junqueira) ---
                            "Tecido Linfoide: Difuso vs. Nodular (Folículos)",
                            "Centros Germinativos: Zona Escura e Clara (Maturação B)",
                            
                            # --- Órgãos Linfoides Primários ---
                            "Timo: Córtex (Seleção Positiva) vs. Medula (Seleção Negativa)",
                            "Barreira Hemato-Tímica e Corpúsculos de Hassall",
                            "Medula Óssea Vermelha: Nichos Hematopoiéticos (Revisão)",
                            
                            # --- Órgãos Linfoides Secundários ---
                            "Linfonodo: Córtex (B), Paracórtex (T) e Medula (Cordões/Seios)",
                            "Circulação Linfática Intranodal (Aferente -> Seios -> Eferente)",
                            "Baço: Polpa Branca (Bainha Periarteriolar/PALS) vs. Polpa Vermelha",
                            "Cordões de Billroth e Sinusoides Esplênicos (Hemocaterese)",
                            "MALT: Placas de Peyer e Células M (Microfold)"
                        ]
                    },
                    {
                        "nome": "Fisiologia",
                        "ilhas": [
                            # --- Imunidade Inata (Abbas - O Alicerce) ---
                            "Barreiras Físicas e Químicas (Epitélios e Defensinas)",
                            "Células da Inata: Neutrófilos, Macrófagos e Células NK",
                            "Receptores de Reconhecimento de Padrão (PRRs e Toll-like/TLRs)",
                            "Sistema Complemento: Vias Clássica, Alternativa e Lectina",
                            "Inflamação Aguda: Citocinas (TNF, IL-1, IL-6) e Recrutamento",
                            
                            # --- Captura e Apresentação ---
                            "Células Dendríticas: Maturação e Migração para Linfonodos",
                            "O Complexo Principal de Histocompatibilidade (MHC) Classe I vs. II",
                            "Processamento de Antígenos: Via Endocítica vs. Citosólica",
                            
                            # --- Imunidade Adaptativa (Linfócitos T) ---
                            "Ativação de T CD4+: As 3 Sinais (MHC, Coestimulação/B7-CD28, Citocinas)",
                            "Subpopulações T Helper: Th1, Th2, Th17 e Tfh (Funções e Citocinas)",
                            "Linfócitos T CD8+ Citotóxicos: Mecanismo de Perforina/Granzima",
                            "Memória Imunológica e Tolerância Central/Periférica",
                            
                            # --- Imunidade Humoral (Linfócitos B) ---
                            "Ativação B: T-dependente vs. T-independente",
                            "Troca de Isotipo (Class Switching) e Maturação de Afinidade",
                            "Classes de Imunoglobulinas: IgG, IgM, IgA, IgE, IgD",
                            "Mecanismos Efetores: Neutralização, Opsonização e ADCC"
                        ]
                    },
                    {
                        "nome": "Semiologia",
                        "ilhas": [
                            # --- Propedêutica Ganglionar (Porto) ---
                            "Técnica de Palpação: Movimentos Circulares e Comparação",
                            "Cadeias Cervicais: Anterior, Posterior, Submandibular e Supraclavicular",
                            "Cadeias Axilares, Epitrocleares e Inguinais",
                            "Semiografia do Linfonodo: Tamanho, Consistência (Pétrea/Elástica) e Mobilidade",
                            "Sinais de Alerta: Linfonodo de Virchow (Supraclavicular E) e Irmã Maria José",
                            
                            # --- Sinais Inflamatórios e Sistêmicos ---
                            "Sinais Cardinais da Inflamação (Celsus): Dor, Calor, Rubor, Tumor e Perda de Função",
                            "Edema vs. Linfedema (Sinal de Stemmer)",
                            "Febre: Fisiopatologia (Pirogênios) e Padrões de Curva Térmica"
                        ]
                    }
                ]
            },
            {
                "nome": "Tegumentar",
                "trilhas": [
                    {
                        "nome": "Anatomia",
                        "ilhas": [
                            # --- Macroscopia e Topografia (Moore) ---
                            "A Pele: Epiderme, Derme e Hipoderme (Tela Subcutânea)",
                            "Linhas de Tensão da Pele (Linhas de Langer) e Incisões",
                            "Dermatátomos e Inervação Cutânea Segmentar",
                            "Vascularização Cutânea: Plexos Superficial e Profundo",
                            
                            # --- Anexos Cutâneos ---
                            "Anatomia da Unha: Matriz, Lúnula, Eponíquio e Hiponíquio",
                            "Anatomia do Pelo: Haste, Raiz e Folículo Piloso",
                            "Glândulas Cutâneas: Sebáceas, Sudoríparas e Mamárias (Visão Geral)"
                        ]
                    },
                    {
                        "nome": "Histologia",
                        "ilhas": [
                            # --- Epiderme (Junqueira - Detalhado) ---
                            "Camadas da Epiderme: Basal, Espinhosa, Granulosa, Lúcida e Córnea",
                            "Queratinócitos: Citoqueratinas e o Processo de Queratinização",
                            "Melanócitos: Síntese de Melanina e Unidade Epidermo-Melânica",
                            "Células de Langerhans (Imunidade) e Células de Merkel (Tato)",
                            "Junções Intercelulares: Desmossomos e Hemidesmossomos",
                            
                            # --- Derme e Hipoderme ---
                            "Derme Papilar (Tecido Conjuntivo Frouxo) e Alças Capilares",
                            "Derme Reticular (Tecido Conjuntivo Denso) e Fibras Elásticas",
                            "Hipoderme: Adipócitos Uniloculares e Panículo Adiposo",
                            
                            # --- Histologia dos Anexos e Receptores ---
                            "Glândulas Sebáceas: Secreção Holócrina e Unidade Pilo-Sebácea",
                            "Glândulas Sudoríparas: Écrinas (Merócrinas) vs. Apócrinas",
                            "Receptores Nervosos: Corpúsculos de Pacini, Meissner e Ruffini",
                            "Terminações Nervosas Livres"
                        ]
                    },
                    {
                        "nome": "Fisiologia",
                        "ilhas": [
                            # --- Funções de Proteção e Homeostase (Guyton) ---
                            "Termorregulação: Vasodilatação, Vasoconstrição e Sudorese",
                            "Controle Hipotalâmico da Temperatura Corporal",
                            "Função Barreira: Proteção contra Desidratação e Patógenos",
                            "Síntese de Vitamina D: Ativação do 7-Desidrocolesterol",
                            "Fotoproteção: O Papel da Melanina e Resposta ao UV",
                            
                            # --- Cicatrização e Sensibilidade ---
                            "Fisiologia da Cicatrização: Inflamação, Proliferação e Maturação",
                            "Sensibilidade Somática: Mecanorrecepção, Termorrecepção e Dor",
                            "Fluxo Sanguíneo Cutâneo e sua Regulação Neural"
                        ]
                    },
                    {
                        "nome": "Semiologia",
                        "ilhas": [
                            # --- Inspeção Geral (Porto - Classificação Clássica) ---
                            "Coloração da Pele: Palidez, Cianose, Icterícia e Eritema",
                            "Umidade, Textura, Temperatura e Turgor (Elasticidade)",
                            "Lesões Elementares: O Método de Análise",
                            
                            # --- Lesões Elementares (A Base da Dermato) ---
                            "Modificações de Cor: Mácula, Mancha e Púrpura (Petéquias/Equimoses)",
                            "Formações Sólidas: Pápula, Nódulo, Placa, Goma e Vegetação",
                            "Coleções Líquidas: Vesícula, Bolha, Pústula e Abscesso",
                            "Alterações de Espessura: Queratose, Liquenificação, Edema e Esclerose",
                            "Perdas Teciduais: Erosão, Úlcera, Fissura e Escoriação",
                            
                            # --- Anexos e Lesões Específicas ---
                            "Semiologia das Unhas: Baqueteamento, Coiloconíquia e Linhas de Beau",
                            "Semiologia dos Cabelos: Alopecias (Areata/Androgenética)",
                            "Lesões por Pressão (Úlceras de Decúbito): Estadiamento",
                            "Regra do ABCDE para Melanoma"
                        ]
                    }
                ]
            },
            {
                "nome": "Renal e Urinário",
                "trilhas": [
                    {
                        "nome": "Anatomia",
                        "ilhas": [
                            # --- Rins: Topografia e Morfologia (Moore) ---
                            "Localização Retroperitoneal e Relações Anatômicas",
                            "Fáscia Renal, Cápsula Adiposa e Cápsula Fibrosa",
                            "Hilo Renal e Pedículo (Veia, Artéria e Pelve)",
                            "Morfologia Interna: Córtex, Medula, Pirâmides e Papilas",
                            "Sistema Coletor: Cálices Menores, Maiores e Pelve Renal",
                            
                            # --- Vascularização (Segmentação é vital para cirurgia) ---
                            "Artérias Renais e Segmentação Vascular (Linha de Brodel)",
                            "Drenagem Venosa (Diferenças entre Esquerda e Direita)",
                            
                            # --- Trato Urinário Inferior ---
                            "Ureteres: Trajeto, Relações e as 3 Constrições (Litíase)",
                            "Bexiga Urinária: Trígono Vesical, Músculo Detrusor e Relações",
                            "Uretra Feminina: Anatomia e Relação com Infecções",
                            "Uretra Masculina: Intramural, Prostática, Membranácea e Esponjosa"
                        ]
                    },
                    {
                        "nome": "Histologia",
                        "ilhas": [
                            # --- O Néfron (Junqueira) ---
                            "Corpúsculo Renal: Cápsula de Bowman e Glomérulo",
                            "Barreira de Filtração: Endotélio Fenestrado e Podócitos (Pedicelos)",
                            "Mesângio Intraglomerular: Funções de Suporte e Fagocitose",
                            "Túbulo Contorcido Proximal: Borda em Escova e Mitocôndrias",
                            "Alça de Henle: Ramos Delgado e Espesso",
                            "Túbulo Distal e a Mácula Densa",
                            "Ductos Coletores: Células Principais e Intercaladas",
                            
                            # --- Aparelho Justaglomerular e Vias ---
                            "Aparelho Justaglomerular: Células JG e Controle de Renina",
                            "Interstício Renal e Eritropoietina",
                            "Urotélio (Epitélio de Transição) e Placas de Membrana"
                        ]
                    },
                    {
                        "nome": "Fisiologia",
                        "ilhas": [
                            # --- Filtração Glomerular (Guyton) ---
                            "Formação da Urina: Filtração, Reabsorção e Secreção",
                            "Ritmo de Filtração Glomerular (RFG) e Fração de Filtração",
                            "Forças de Starling no Glomérulo (Hidrostática vs Coloidosmótica)",
                            "Autoreguação do RFG: Mecanismo Miogênico e Feedback Tubuloglomerular",
                            "Conceito de Depuração Plasmática (Clearance) e Creatinina",
                            
                            # --- Processamento Tubular ---
                            "Reabsorção Proximal: Sódio, Glicose (Limiar Renal) e Água",
                            "Mecanismo de Contracorrente (Multiplicador da Alça de Henle)",
                            "Vasa Recta como Trocador de Contracorrente",
                            "Túbulo Distal e Coletor: Ação da Aldosterona e ADH (Vasopressina)",
                            "Regulação do Potássio, Cálcio e Magnésio",
                            
                            # --- Funções Sistêmicas ---
                            "Regulação do Volume Extracelular e Pressão Arterial (Natriurese)",
                            "Equilíbrio Ácido-Base: Secreção de H+ e Tampão Bicarbonato",
                            "Reflexo da Micção e Controle Neural da Bexiga"
                        ]
                    },
                    {
                        "nome": "Semiologia",
                        "ilhas": [
                            # --- Anamnese Nefrológica (Porto) ---
                            "Alterações da Diurese: Poliúria, Oligúria e Anúria",
                            "Alterações do Ritmo: Polaciúria, Nictúria e Urgência",
                            "Alterações da Micção: Disúria, Estrangúria e Retenção",
                            "Características da Urina: Hematúria (Macro/Micro), Piúria e Espuma",
                            "Dor Renal (Cólica Nefrética) vs. Dor Lombar Muscular",
                            
                            # --- Exame Físico ---
                            "Inspeção do Abdome e Região Lombar (Abaulamentos)",
                            "Palpação Renal: Método Bimanual (Guyon) e Sinal da Tecla",
                            "Palpação de Israel e Método de Goelet",
                            "Pontos Ureterais (Superiores e Médios)",
                            "Percussão: Sinal de Giordano (Punho-Percussão Lombar)",
                            "Palpação e Percussão da Bexiga (Globo Vesical)",
                            "Ausculta Abdominal: Sopro em Artéria Renal (Estenose)"
                        ]
                    }
                ]
            },
            {
                "nome": "Reprodutor",
                "trilhas": [
                    {
                        "nome": "Anatomia",
                        "ilhas": [
                            # --- Anatomia Masculina (Moore) ---
                            "Escroto e Testículos: Túnicas (Vaginal/Albugínea) e Epidídimo",
                            "Funículo Espermático: Conteúdo (Ducto Deferente, Vasos) e Fáscias",
                            "Próstata: Zonas Anatômicas (Periférica, Transição, Central) e Relações",
                            "Glândulas Seminais e Bulbouretrais",
                            "Pênis: Raiz, Corpo, Glande e Prepúcio",
                            "Tecidos Eréteis: Corpos Cavernosos e Corpo Esponjoso",
                            "Uretra Masculina: Trajeto e Divisões",
                            
                            # --- Anatomia Feminina ---
                            "Ovários: Localização, Ligamentos (Suspensor, Próprio) e Relações",
                            "Tubas Uterinas: Infundíbulo, Ampola (Fecundação), Istmo e Intramural",
                            "Útero: Corpo, Fundo, Istmo e Colo (Cérvix)",
                            "Posições do Útero (Anteversoflexão vs. Retroversão)",
                            "Vagina: Fórnices e Relações Anatômicas",
                            "Genitália Externa (Vulva): Lábios, Clitóris e Vestíbulo",
                            
                            # --- Períneo e Mamas ---
                            "Diafragma Pélvico (Levantador do Ânus) e Períneo (Triângulos)",
                            "Mamas: Glândula, Ductos, Ligamentos de Cooper e Drenagem Linfática"
                        ]
                    },
                    {
                        "nome": "Histologia",
                        "ilhas": [
                            # --- Histologia Masculina (Junqueira) ---
                            "Testículo: Túbulos Seminíferos e Epitélio Germinativo",
                            "Células de Sertoli (Barreira Hematotesticular) vs. Células de Leydig",
                            "Ductos Genitais: Epidídimo (Estereocílios) e Deferente",
                            "Próstata: Glândulas Tubuloalveolares e Concreções Prostáticas",
                            "Pênis: Sinusoides Vasculares e Mecanismo Erétil",
                            
                            # --- Histologia Feminina ---
                            "Ovário: Córtex, Medula e Folículos Ovarianos (Primordial a Graaf)",
                            "Corpo Lúteo e Corpo Albicans",
                            "Tuba Uterina: Células Ciliadas e Secretoras (Peg Cells)",
                            "Útero: Miométrio e Endométrio (Basal vs. Funcional)",
                            "Colo Uterino: A Junção Escamo-Colunar (JEC) e Zonas de Transformação",
                            "Vagina: Epitélio Estratificado e Glicogênio",
                            "Glândula Mamária: Ativa (Lactação) vs. Inativa"
                        ]
                    },
                    {
                        "nome": "Fisiologia",
                        "ilhas": [
                            # --- Eixo Hipotálamo-Hipófise-Gônada (Guyton) ---
                            "GnRH, LH e FSH: Padrões de Secreção Pulsátil",
                            "Puberdade: O Despertar do Eixo e Caracteres Sexuais Secundários",
                            
                            # --- Fisiologia Masculina ---
                            "Espermatogênese: Meiose e Maturação (Espermiogênese)",
                            "Função da Testosterona e Dihidrotestosterona (DHT)",
                            "Fisiologia da Ereção (Óxido Nítrico/GMPc) e Ejaculação (Simpático)",
                            
                            # --- Fisiologia Feminina (Ciclo Menstrual) ---
                            "Ciclo Ovariano: Fase Folicular, Ovulação (Pico de LH) e Lútea",
                            "Teoria das Duas Células (Teca/LH e Granulosa/FSH)",
                            "Ciclo Endometrial: Proliferativo (Estrogênio) e Secretor (Progesterona)",
                            "Menopausa: Falência Ovariana e Alterações Hormonais",
                            
                            # --- Fecundação e Gestação ---
                            "Fecundação, Reação acrossômica e Implantação",
                            "Placenta: Produção de hCG, Estrogênio e Progesterona",
                            "Fisiologia da Lactação: Prolactina (Produção) e Ocitocina (Ejeção)"
                        ]
                    },
                    {
                        "nome": "Semiologia",
                        "ilhas": [
                            # --- Exame das Mamas (Porto) ---
                            "Inspeção Estática e Dinâmica (Retrações/Abaulamentos)",
                            "Palpação das Mamas: Técnica, Quadrantes e Nódulos",
                            "Expressão Papilar (Descarga) e Palpação Axilar",
                            
                            # --- Ginecologia ---
                            "Posição Ginecológica e Inspeção da Vulva",
                            "Exame Especular: Técnica, Visualização do Colo e Coleta (Pap)",
                            "Toque Vaginal Bimanual: Tamanho/Mobilidade do Útero e Anexos",
                            
                            # --- Andrologia ---
                            "Inspeção do Pênis: Prepúcio (Fimose), Glande e Meato",
                            "Palpação da Bolsa Escrotal: Testículos, Epidídimo e Varicocele",
                            "Reflexo Cremastérico e Transiluminação",
                            "Toque Retal: Avaliação da Próstata (Tamanho, Consistência, Nódulos)",
                            
                            # --- Maturação Sexual ---
                            "Estadiamento de Tanner (Mamas, Genitais e Pelos Pubianos)"
                        ]
                    }
                ]
            },
            {
                "nome": "Musculoesquelético",
                "trilhas": [
                    {
                        "nome": "Anatomia",
                        "ilhas": [
                            # --- Introdução e Generalidades (Moore) ---
                            "Esqueleto: Axial vs. Apendicular e Classificação dos Ossos",
                            "Acidentes Ósseos: Tipos (Côndilos, Processos, Tuberosidades)",
                            "Articulações: Classificação (Fibrosas, Cartilagíneas, Sinoviais)",
                            "Anatomia da Articulação Sinovial (Cápsula, Membrana, Líquido)",
                            
                            # --- Dorso e Coluna Vertebral ---
                            "Vértebras: Estrutura Típica e Diferenças Regionais (C/T/L)",
                            "Articulações da Coluna: Discos Intervertebrais e Zigoapofisárias",
                            "Ligamentos da Coluna: Longitudinais, Amarelo e Interespinhais",
                            "Músculos do Dorso: Extrínsecos (Trapézio/Latíssimo) vs. Intrínsecos",
                            "Músculos Suboccipitais e Triângulo Suboccipital",
                            
                            # --- Membro Superior: Cíngulo e Braço ---
                            "Osteologia do Cíngulo: Clavícula e Escápula (Acidentes)",
                            "Axila: Limites (Paredes), Ápice e Conteúdo Neurovascular",
                            "Músculos Tóraco-Apendiculares (Peitorais e Serrátil)",
                            "Músculos Escapuloumerais: Manguito Rotador e Deltoide",
                            "Articulação do Ombro (Glenoumeral): Ligamentos e Bolsas",
                            "Braço: Compartimento Anterior (Flexores/Bíceps) e Posterior (Tríceps)",
                            
                            # --- Membro Superior: Antebraço e Mão ---
                            "Cotovelo: Articulação e Fossa Cubital (Limites/Conteúdo)",
                            "Antebraço: Compartimento Anterior (Flexores/Pronadores)",
                            "Antebraço: Compartimento Posterior (Extensores/Supinadores)",
                            "Punho: Túnel do Carpo (Retináculo e Nervo Mediano)",
                            "Mão: Ossos do Carpo, Metacarpos e Falanges",
                            "Músculos Intrínsecos da Mão: Tenares, Hipotenares e Lumbricais",
                            
                            # --- Membro Inferior: Quadril e Coxa ---
                            "Pelve Óssea: Ílio, Ísquio, Púbis e Diferenças Sexuais",
                            "Articulação do Quadril: Cápsula e Ligamentos (Iliofemoral/Isquiofemoral)",
                            "Região Glútea: Músculos, Forames Isquiáticos e Nervo Ciático",
                            "Trígono Femoral: Limites e Conteúdo (NAV Femoral)",
                            "Coxa: Compartimento Anterior (Quadríceps e Sartório)",
                            "Coxa: Compartimento Medial (Adutores) e Canal dos Adutores",
                            "Coxa: Compartimento Posterior (Isquiotibiais)",
                            
                            # --- Membro Inferior: Perna e Pé ---
                            "Joelho: Meniscos, Cruzados (LCA/LCP) e Colaterais",
                            "Fossa Poplítea: Limites e Conteúdo",
                            "Perna: Compartimentos Anterior, Lateral (Fibulares) e Posterior (Tríceps Sural)",
                            "Tornozelo (Talocrural): Ligamentos Colaterais (Lateral/Medial)",
                            "Pé: Ossos do Tarso, Arcos Plantares e Fáscia Plantar"
                        ]
                    },
                    {
                        "nome": "Histologia",
                        "ilhas": [
                            # --- Tecido Ósseo (Junqueira) ---
                            "Matriz Óssea: Parte Orgânica (Colágeno I) vs. Inorgânica (Hidroxiapatita)",
                            "Células: Osteoblastos (Síntese), Osteócitos e Osteoclastos (Reabsorção)",
                            "Osso Compacto (Sistemas de Havers) vs. Esponjoso (Trabéculas)",
                            "Periósteo e Endósteo: Camadas e Funções",
                            "Ossificação: Intramembranosa vs. Endocondral",
                            "Crescimento Ósseo: O Disco Epifisário (Zonas)",
                            
                            # --- Tecido Muscular e Articular ---
                            "Músculo Esquelético: Organização (Epi, Peri e Endomísio)",
                            "A Fibra Muscular: Sarcolema, Túbulos T e Retículo Sarcoplasmático",
                            "Miofibrilas e Sarcômero: Bandas A, I, H e Linha Z",
                            "Junção Miotendínea e Fusos Musculares (Propriocepção)",
                            "Cartilagem Hialina (Articular) e Fibrocartilagem (Discos/Meniscos)",
                            "Membrana Sinovial e Sinoviócitos (Tipos A e B)"
                        ]
                    },
                    {
                        "nome": "Fisiologia",
                        "ilhas": [
                            # --- Excitação e Contração (Guyton) ---
                            "Junção Neuromuscular: Liberação de Ach e Potencial de Placa",
                            "Acoplamento Excitação-Contração: Tríade e Liberação de Ca++",
                            "Proteínas Contráteis (Actina/Miosina) e Reguladoras (Troponina/Tropomiosina)",
                            "Ciclo das Pontes Cruzadas (Teoria do Filamento Deslizante)",
                            "Relaxamento Muscular e Recaptação de Cálcio (SERCA)",
                            
                            # --- Mecânica e Energética ---
                            "Tipos de Contração: Isométrica vs. Isotônica (Concêntrica/Excêntrica)",
                            "Mecânica: Somação de Frequência, Tetanização e Fadiga",
                            "Tipos de Fibras: Tipo I (Lentas/Oxidativas) vs. Tipo II (Rápidas/Glicolíticas)",
                            "Metabolismo Muscular: Fosfocreatina, Glicogênio e Dívida de O2",
                            "Remodelação Óssea: Papel do PTH, Calcitonina e Vitamina D"
                        ]
                    },
                    {
                        "nome": "Semiologia",
                        "ilhas": [
                            # --- Exame Físico Geral (Porto) ---
                            "Inspeção da Postura: Escoliose (Teste de Adams), Cifose e Lordose",
                            "Tipos de Marcha: Helicópode, Anserina, Escarvante e Claudicante",
                            "Avaliação da Força Muscular (Graus 0 a 5 - MRC)",
                            "Goniometria: Amplitude de Movimento (ADM) Ativa e Passiva",
                            
                            # --- Manobras Específicas (Membro Superior) ---
                            "Ombro: Teste de Neer e Hawkins (Impacto)",
                            "Ombro: Teste de Jobe (Supraespinhal) e Gerber (Subescapular)",
                            "Cotovelo: Testes para Epicondilite (Cozen e Mill)",
                            "Punho: Phalen e Tinel (Síndrome do Túnel do Carpo)",
                            
                            # --- Manobras Específicas (Coluna e Membro Inferior) ---
                            "Coluna: Teste de Lasègue e Bragard (Radiculopatia/Ciático)",
                            "Quadril: Patrick (FABERE) e Thomas (Contratura em Flexão)",
                            "Quadril Pediátrico: Barlow e Ortolani (Displasia)",
                            "Joelho: Lachman e Gaveta Anterior (LCA) / Posterior (LCP)",
                            "Joelho: McMurray e Apley (Meniscos)",
                            "Joelho: Estresse em Valgo e Varo (Ligamentos Colaterais)"
                        ]
                    }
                ]
            },
            {
                "nome": "Gastrointestinal",
                "trilhas": [
                    {
                        "nome": "Anatomia",
                        "ilhas": [
                            # --- Tubo Digestivo Alto (Moore) ---
                            "Cavidade Oral: Língua, Dentes e Glândulas Salivares",
                            "Esôfago: Porções (Cervical, Torácica, Abdominal) e Constrições",
                            "Estômago: Regiões (Cárdia, Fundo, Corpo, Antro, Piloro)",
                            "Relações Peritoneais do Estômago e Omentos",
                            
                            # --- Intestinos ---
                            "Duodeno: As 4 Porções e Relação com o Pâncreas",
                            "Jejuno e Íleo: Diferenças Anatômicas e Arcadas Vasculares",
                            "Intestino Grosso: Ceco, Apêndice (Posições), Cólon e Reto",
                            "Canal Anal: Linha Pectínea, Esfíncteres e Zonas Hemorroidárias",
                            
                            # --- Órgãos Anexos (Fígado e Pâncreas) ---
                            "Fígado: Faces, Ligamentos e Tríade Portal",
                            "Segmentação Hepática de Couinaud (Anatomia Cirúrgica)",
                            "Vias Biliares Extra-hepáticas: Ducto Cístico e Colédoco",
                            "Pâncreas: Cabeça, Processo Uncinado, Corpo e Cauda",
                            
                            # --- Vascularização Abdominal (Vital) ---
                            "Tronco Celíaco e seus Ramos",
                            "Artéria Mesentérica Superior e Inferior",
                            "Sistema Porta Hepático: Formação e Tributárias",
                            "Peritônio: Parietal, Visceral, Mesentério e Retroperitônio"
                        ]
                    },
                    {
                        "nome": "Histologia",
                        "ilhas": [
                            # --- Plano Geral do Trato GI (Junqueira) ---
                            "Camadas do Trato GI: Mucosa, Submucosa, Muscular e Serosa/Adventícia",
                            "Plexos Nervosos Intramurais: Meissner e Auerbach",
                            
                            # --- Estruturas Específicas ---
                            "Esôfago: Epitélio Estratificado e Glândulas Esofágicas",
                            "Estômago: Fossetas Gástricas e Tipos Celulares (Parietal, Principal, G)",
                            "Renovação Celular do Epitélio Gástrico",
                            "Intestino Delgado: Vilosidades, Microvilosidades e Criptas de Lieberkühn",
                            "Células de Paneth e Células M (Imunidade)",
                            "Intestino Grosso: Células Caliciformes e Ausência de Vilosidades",
                            
                            # --- Glândulas Anexas ---
                            "Fígado: O Lóbulo Hepático Clássico vs. Lóbulo Portal vs. Ácino",
                            "Hepatócitos, Sinusoides e Células de Kupffer",
                            "Espaço de Disse e Células Estreladas (Ito)",
                            "Pâncreas Exócrino: Ácinos Serosos e Grânulos de Zimogênio"
                        ]
                    },
                    {
                        "nome": "Fisiologia",
                        "ilhas": [
                            # --- Princípios Gerais e Motilidade (Guyton) ---
                            "Sistema Nervoso Entérico: O 'Segundo Cérebro'",
                            "Atividade Elétrica: Ondas Lentas e Potenciais em Espícula",
                            "Motilidade: Peristaltismo (Propulsão) vs. Segmentação (Mistura)",
                            "Fluxo Sanguíneo Esplâncnico e Hiperemia Pós-prandial",
                            "Deglutição (Fases) e Motilidade Esofágica",
                            "Esvaziamento Gástrico e Bomba Pilórica",
                            
                            # --- Secreções Digestivas (Mecanismos Moleculares) ---
                            "Secreção Salivar e Controle Nervoso",
                            "Secreção Gástrica: Mecanismo da Bomba de Prótons (HCl)",
                            "Regulação da Secreção Gástrica: Fases Cefálica, Gástrica e Intestinal",
                            "Secreção Pancreática: Bicarbonato (Secretina) e Enzimas (CCK)",
                            "Bile: Composição, Secreção e Função dos Sais Biliares",
                            "Circulação Entero-hepática dos Sais Biliares",
                            
                            # --- Digestão e Absorção ---
                            "Digestão e Absorção de Carboidratos (Cotransporte Na+)",
                            "Digestão e Absorção de Proteínas e Peptídeos",
                            "Digestão de Gorduras: Emulsificação e Formação de Micelas",
                            "Absorção de Água, Eletrólitos e Vitaminas (B12/Fator Intrínseco)",
                            
                            # --- Fisiologia Hepática ---
                            "Funções Metabólicas do Fígado (Carboidratos, Lipídios, Proteínas)",
                            "Bilirrubina: Formação, Conjugação e Excreção"
                        ]
                    },
                    {
                        "nome": "Semiologia",
                        "ilhas": [
                            # --- Topografia e Inspeção (Porto) ---
                            "Divisão Topográfica: 4 Quadrantes vs. 9 Regiões",
                            "Inspeção: Tipos de Abdome (Globoso, Batráquio, Escavado)",
                            "Cicatrizes Cirúrgicas e Circulação Colateral (Tipo Porta vs. Cava)",
                            "Sinais: Cullen e Grey-Turner (Hemorragia Retroperitoneal)",
                            
                            # --- Ausculta e Percussão ---
                            "Ausculta: Ruídos Hidroaéreos (RHA) e Borborigmos",
                            "Sopros Abdominais (Aorta, Renais, Ilíacas)",
                            "Percussão: Timpanismo, Macicez e o Espaço de Traube",
                            "Pesquisa de Ascite: Piparote, Macicez Móvel e Semicírculo de Skoda",
                            "Hepatometria (Determinação do Tamanho do Fígado à Percussão)",
                            
                            # --- Palpação (Superficial e Profunda) ---
                            "Palpação Superficial: Tensão Abdominal e Defesa Muscular",
                            "Palpação Profunda: Identificação de Massas e Vísceras",
                            "Palpação do Fígado: Técnica de Lemos-Torres e Mathieu",
                            "Palpação do Baço (Esplenomegalia) e Manobra de Schuster",
                            "Sinais de Irritação Peritoneal: Blumberg (Apêndice) e Rovsing",
                            "Sinal de Murphy (Vesícula Biliar) e Giordano (Rins)"
                        ]
                    }
                ]
            },
            {
                "nome": "Nervoso",
                "trilhas": [
                    {
                        "nome": "Anatomia",
                        "ilhas": [
                            # --- Encéfalo e Proteção (Moore) ---
                            "Telencéfalo: Lobos, Giros e Sulcos Principais",
                            "Áreas Corticais Funcionais (Brodmann): Motor, Sensitivo e Linguagem",
                            "Núcleos da Base: Caudado, Putâmen e Globo Pálido",
                            "Diencéfalo: Tálamo (A Estação Repassadora) e Hipotálamo",
                            "Meninges (Dura, Aracnoide, Pia) e Espaços Meníngeos",
                            "Sistema Ventricular e Líquido Cefalorraquidiano (LCR)",
                            
                            # --- Tronco e Cerebellum ---
                            "Tronco Encefálico: Mesencéfalo, Ponte e Bulbo (Anatomia Externa)",
                            "Cerebelo: Vermis, Hemisférios e Pedúnculos Cerebelares",
                            "Medula Espinhal: Substância Cinzenta (H) e Funiculos",
                            
                            # --- Vascularização (Vital para AVC) ---
                            "Vascularização Arterial: Carótidas Internas e Vertebrais",
                            "Polígono de Willis e Artérias Cerebrais (Anterior, Média, Posterior)",
                            "Drenagem Venosa: Seios Durais e Veia Jugular Interna"
                        ]
                    },
                    {
                        "nome": "Histologia",
                        "ilhas": [
                            # --- Tecido Nervoso (Junqueira) ---
                            "Neurônios: Corpo (Soma), Dendritos e Axônio",
                            "Fluxo Axonal: Anterógrado (Cinesina) e Retrógrado (Dineína)",
                            "Células da Glia (SNC): Astrócitos (Pés Vasculares e BHE)",
                            "Células da Glia (SNC): Oligodendrocytes (Mielina) e Micróglia",
                            "Células da Glia (SNP): Células de Schwann e Satélites",
                            
                            # --- Organização e Revestimentos ---
                            "A Fibra Nervosa: Bainha de Mielina e Nódulos de Ranvier",
                            "Nervos Periféricos: Epineuro, Perineuro e Endoneuro",
                            "Plexo Coroide e a Produção de LCR",
                            "Barreira Hematoencefálica: Junções de Oclusão e Astrócitos"
                        ]
                    },
                    {
                        "nome": "Fisiologia",
                        "ilhas": [
                            # --- Neurofisiologia Celular (Guyton) ---
                            "Potencial de Repouso e Bomba Na+/K+",
                            "Potencial de Ação: Despolarização, Repolarização e Hiperpolarização",
                            "Condução Saltatória e Fatores de Velocidade",
                            "Sinapses: Elétricas vs. Químicas (Vesículas e Receptores)",
                            "Neurotransmissores: Glutamato (Excitatório) vs. GABA (Inibitório)",
                            
                            # --- Sistemas Sensoriais e Dor ---
                            "Somatossensorial: Coluna Dorsal (Tato Fino) vs. Anterolateral (Dor/Temp)",
                            "Córtex Somatossensorial Primário e Homúnculo Sensitivo",
                            "Fisiologia da Dor: Nociceptores, Vias Rápidas/Lentas e Analgesia Endógena",
                            
                            # --- Controle Motor ---
                            "Córtex Motor e Trato Corticoespinhal (Piramidal)",
                            "Gânglios da Base e Controle do Movimento (Via Direta/Indireta)",
                            "Cerebelo: Comparador de Movimento e Aprendizado Motor",
                            "Sistema Nervoso Autônomo: Simpático vs. Parassimpático"
                        ]
                    },
                    {
                        "nome": "Semiologia",
                        "ilhas": [
                            # --- Estado Mental e Funções Corticais (Porto) ---
                            "Nível de Consciência: Escala de Coma de Glasgow",
                            "Conteúdo da Consciência: Orientação, Memória e Linguagem (Afasias)",
                            "Sinais de Irritação Meníngea: Rigidez de Nuca, Kernig e Brudzinski",
                            
                            # --- Pares Cranianos (I a XII) ---
                            "I (Olfatório) e II (Óptico - Campo Visual e Fundo de Olho)",
                            "III, IV e VI (Oculomotores): Pupilas e Movimentação Ocular",
                            "V (Trigêmeo) e VII (Facial - Periférica vs Central)",
                            "VIII (Vestibulococlear), IX e X (Reflexo de Vômito)",
                            "XI (Acessório) e XII (Hipoglosso)",
                            
                            # --- Motricidade e Sensibilidade ---
                            "Força Muscular (Manobras Deficitárias: Mingazzini/Barré)",
                            "Tônus Muscular (Espasticidade vs Rigidez) e Trofismo",
                            "Reflexos Profundos (Bicipital, Patelar, etc) e Cutâneo-Plantar (Babinski)",
                            "Coordenação (Index-Nariz, Diadococinesia) e Marcha",
                            "Sensibilidade: Tátil, Dolorosa, Térmica e Vibratória"
                        ]
                    }
                ]
            },
            {
                "nome": "Endócrino",
                "trilhas": [
                    {
                        "nome": "Anatomia",
                        "ilhas": [
                            # --- Eixo Central (Cabeça e Pescoço) ---
                            "Hipotálamo e Hipófise: Relação com a Sela Turca e Quiasma Óptico",
                            "Hipófise: Lóbulo Anterior (Adeno) e Posterior (Neuro)",
                            "Vascularização: Sistema Porta-Hipofisário",
                            "Tireoide: Lobos, Istmo e Relações (Traqueia/Laríngeo Recorrente)",
                            "Paratireoides: Localização e Variabilidade Anatômica",
                            
                            # --- Glândulas Periféricas ---
                            "Adrenais (Suprarrenais): Relações Anatômicas e Fáscia Renal",
                            "Adrenais: Diferenciação Macro (Córtex vs Medula)",
                            "Pâncreas Endócrino: Distribuição das Ilhotas na Cauda/Corpo",
                            "Timo e Pineal: Noções Anatômicas e Involução"
                        ]
                    },
                    {
                        "nome": "Histologia",
                        "ilhas": [
                            # --- Hipófise e Eixo Central (Junqueira) ---
                            "Adenohipófise: Cromófilas (Acidófilas/Basófilas) e Cromófobas",
                            "Neurohipófise: Pituícitos e Corpos de Herring (Armazenamento)",
                            
                            # --- Tireoide e Paratireoide ---
                            "Tireoide: Folículo Tireoidiano, Colóide e Tiriócitos",
                            "Células Parafoliculares (Células C) e Calcitonina",
                            "Paratireoide: Células Principais (PTH) e Células Oxífilas",
                            
                            # --- Adrenal e Pâncreas ---
                            "Córtex Adrenal: Zona Glomerulosa (Mineralo)",
                            "Córtex Adrenal: Zona Fasciculada (Glicocorticoide)",
                            "Córtex Adrenal: Zona Reticular (Andrógenos)",
                            "Medula Adrenal: Células Cromafins e Catecolaminas",
                            "Ilhotas de Langerhans: Células Alfa, Beta e Delta"
                        ]
                    },
                    {
                        "nome": "Fisiologia",
                        "ilhas": [
                            # --- Princípios Gerais (Guyton) ---
                            "Classificação Química: Peptídeos, Esteroides e Aminas",
                            "Mecanismos de Ação: Receptores de Membrana vs. Nucleares",
                            "Feedback Negativo e Positivo (Alças Longas e Curtas)",
                            
                            # --- Eixos Hipotalâmicos ---
                            "Eixo Hipotálamo-Hipófise-Tireoide (TRH -> TSH -> T3/T4)",
                            "Eixo Hipotálamo-Hipófise-Adrenal (CRH -> ACTH -> Cortisol)",
                            "Hormônio do Crescimento (GH): IGF-1 e Efeitos Metabólicos",
                            "Prolactina: Regulação Inibitória (Dopamina)",
                            "Neurohipófise: ADH (Vasopressina) e Osmolaridade",
                            "Neurohipófise: Ocitocina (Parto e Ejeção do Leite)",
                            
                            # --- Metabolismo e Homeostase ---
                            "Tireoide: Síntese (TPO), Captura de Iodo e Efeitos do T3",
                            "Cálcio: PTH (Osso/Rim), Vitamina D e Calcitonina",
                            "Adrenal: Cortisol (Stress/Inflamação) e Ritmo Circadiano",
                            "Adrenal: Aldosterona e Sistema Renina-Angiotensina (Revisão)",
                            "Pâncreas: Insulina (Receptor Tyrosine Kinase e GLUTs)",
                            "Pâncreas: Glucagon e Contrarregulação da Glicose"
                        ]
                    },
                    {
                        "nome": "Semiologia",
                        "ilhas": [
                            # --- Avaliação Geral e Fácies (Porto) ---
                            "Anamnese Endócrina: Variação de Peso, Polidipsia e Intolerância Térmica",
                            "Fácies Cushingoide: Lua Cheia, Hirsutismo e Acne",
                            "Fácies Hipotireoidea (Mixedematosa) vs. Hipertireoidea (Graves)",
                            "Fácies Acromegálica: Prognatismo e Arcos Superciliares",
                            
                            # --- Exame da Tireoide (Fundamental) ---
                            "Inspeção Cervical: Bócio Difuso vs. Nodular",
                            "Palpação da Tireoide: Abordagem Posterior e Anterior",
                            "Classificação do Bócio (OMS: 0, 1 e 2)",
                            "Ausculta da Tireoide (Sopros em Graves)",
                            "Sinais Oculares: Exoftalmia, Sinal de Lid Lag (Graefe)",
                            
                            # --- Sinais Sistêmicos ---
                            "Sinais de Cushing: Giba, Estrias Violáceas e Miopatia Proximal",
                            "Sinais de Addison: Hiperpigmentação Cutânea e Hipotensão",
                            "Sinais de Tetania (Hipocalcemia): Chvostek e Trousseau",
                            "Pé Diabético: Avaliação com Monofilamento (Sensibilidade)"
                        ]
                    }
                ]
            }
        ]
    }
]
# ==============================================================================
# 🏗️ O CONSTRUTOR (A Lógica que monta o banco)
# ==============================================================================
def construir_curriculo():
    print("🏥 Iniciando a construção do Hospital Virtual (MediLingo)...")

    for area_data in CURRICULO_MEDICINA:
        # 1. Cria/Pega a Grande Área (Ex: Fisiológico)
        print(f"\n📍 Processando Área: {area_data['area']}...")
        res_area = supabase.table("areas").select("id").eq("nome", area_data['area']).execute()
        
        if res_area.data:
            area_id = res_area.data[0]['id']
        else:
            # Se não existe, cria
            novo = supabase.table("areas").insert({"nome": area_data['area']}).execute()
            area_id = novo.data[0]['id']

        # 2. Loop nos Sistemas
        for sistema_data in area_data['sistemas']:
            print(f"  🧠 Sistema: {sistema_data['nome']}")
            
            # Busca ID do sistema ou cria
            res_sis = supabase.table("systems").select("id").eq("nome", sistema_data['nome']).execute()
            if res_sis.data:
                sis_id = res_sis.data[0]['id']
            else:
                novo = supabase.table("systems").insert({"nome": sistema_data['nome'], "area_id": area_id}).execute()
                sis_id = novo.data[0]['id']

            # 3. Loop nas Trilhas (Subseções)
            ordem_trilha = 1
            for trilha_data in sistema_data['trilhas']:
                nome_trilha = trilha_data['nome'] # Ex: Semiologia
                
                # Busca ID da trilha ou cria
                # (Aqui filtramos por system_id também, pois "Anatomia" existe em Cardio e Neuro)
                res_mod = supabase.table("modules").select("id").match({"nome": nome_trilha, "system_id": sis_id}).execute()
                
                if res_mod.data:
                    mod_id = res_mod.data[0]['id']
                else:
                    novo = supabase.table("modules").insert({
                        "nome": nome_trilha, 
                        "system_id": sis_id, 
                        "ordem": ordem_trilha
                    }).execute()
                    mod_id = novo.data[0]['id']
                
                ordem_trilha += 1

                # 4. Loop nas Ilhas (Lições)
                pos_x = 1
                for ilha_nome in trilha_data['ilhas']:
                    # Verifica se a ilha já existe nesse módulo
                    res_lesson = supabase.table("lessons").select("id").match({"titulo": ilha_nome, "module_id": mod_id}).execute()
                    
                    if not res_lesson.data:
                        supabase.table("lessons").insert({
                            "titulo": ilha_nome,
                            "module_id": mod_id,
                            "posicao_x": pos_x,
                            "posicao_y": 1 
                        }).execute()
                        print(f"    ➡️ Ilha criada: {ilha_nome}")
                    
                    pos_x += 1

    print("\n✅ Construção finalizada com sucesso! Verifique o Supabase.")

if __name__ == "__main__":
    construir_curriculo()