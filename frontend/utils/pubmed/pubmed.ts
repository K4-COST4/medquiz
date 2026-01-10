// utils/pubmed.ts

const PUBMED_API_KEY = process.env.PUBMED_API_KEY || "";
// Substitua pelo seu email real para o NCBI saber quem contatar se der erro
const APP_EMAIL = "seu_email@exemplo.com";
const TOOL_NAME = "MedAI_Student_App";

// Helper para montar a URL com as credenciais certas
function getBaseUrl(endpoint: string): string {
    let url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/${endpoint}.fcgi?db=pubmed&retmode=json`;

    // Identificação (Boa prática exigida pelo NCBI)
    url += `&tool=${TOOL_NAME}&email=${APP_EMAIL}`;

    // Adiciona a chave apenas se ela existir no .env
    if (PUBMED_API_KEY) {
        url += `&api_key=${PUBMED_API_KEY}`;
    }

    return url;
}

export interface PubMedArticle {
    title: string;
    abstract: string;
    url: string;
    pubDate: string;
    authors: string[];
}

// 1. Busca os IDs
async function searchPubMedIds(query: string): Promise<string[]> {
    // Filtros solicitados:
    // 1. Data: 2000 até o presente (usando 3000 para garantir futuro)
    // 2. Tipos: Reviews, Trials, Guidelines, etc.
    const pubTypes = [
        "Review",
        "Systematic Review",
        "Meta-Analysis",
        "Practice Guideline",
        "Clinical Trial",
        "Randomized Controlled Trial",
        "Guideline",
        "Government Publications",
        "Observational Study"
    ];

    const typeFilter = pubTypes.map(t => `"${t}"[Publication Type]`).join(" OR ");
    const dateFilter = "2000:3000[dp]"; // Date of Publication

    // Monta a query composta: (Termo) AND (Data) AND (Tipos)
    const finalQuery = `(${query}) AND (${dateFilter}) AND (${typeFilter})`;

    // retmax=5 e sort=relevance
    const url = `${getBaseUrl("esearch")}&term=${encodeURIComponent(finalQuery)}&retmax=5&sort=relevance`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.esearchresult?.idlist || [];
    } catch (error) {
        console.error("Erro no PubMed Search:", error);
        return [];
    }
}

// 2. Busca os Detalhes
async function fetchArticleDetails(ids: string[]): Promise<PubMedArticle[]> {
    if (ids.length === 0) return [];

    const idsStr = ids.join(",");
    const url = `${getBaseUrl("esummary")}&id=${idsStr}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        const result = data.result;

        // O 'result' contém os UIDs como chaves (ex: "345678"), exceto a chave 'uids' que é uma lista.
        // Filtramos para pegar apenas os objetos dos artigos.
        const articles: PubMedArticle[] = ids
            .map(id => result[id])
            .filter(item => item !== undefined) // Remove undefined se algum ID falhar
            .map((item: any) => ({
                title: item.title || "Sem título",
                // O esummary não traz abstract completo, usamos o título e fonte como resumo
                abstract: `Estudo publicado em: ${item.source} (${item.pubdate}).`,
                url: `https://pubmed.ncbi.nlm.nih.gov/${item.uid}/`,
                pubDate: item.pubdate,
                authors: item.authors?.map((a: any) => a.name) || []
            }));

        return articles;
    } catch (error) {
        console.error("Erro no PubMed Summary:", error);
        return [];
    }
}

// Função Principal
export async function getPubMedEvidence(query: string): Promise<string> {
    try {
        const ids = await searchPubMedIds(query);
        const articles = await fetchArticleDetails(ids);

        if (articles.length === 0) return "";

        return articles.map(art =>
            `--- EVIDÊNCIA CIENTÍFICA (PubMed) ---\nTítulo: ${art.title}\nData: ${art.pubDate}\nLink: ${art.url}\nResumo: ${art.abstract}`
        ).join("\n\n");

    } catch (error) {
        console.error("Erro geral no serviço PubMed:", error);
        return "";
    }
}