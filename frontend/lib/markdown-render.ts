import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { deepmerge } from 'deepmerge-ts';

// Schema de sanitização para web (restritivo)
const webSchema = defaultSchema;

// Schema para Anki (menos restritivo, mas NUNCA <script>)
const ankiSchema = deepmerge(defaultSchema, {
    tagNames: ['div', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'br', 'hr', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    attributes: {
        '*': ['className', 'id', 'style'], // permitir classes e styles
        img: ['src', 'alt', 'width', 'height'],
        a: ['href', 'title'],
        code: ['className'],
    }
});

// CRÍTICO: Remover tags perigosas mesmo no Anki
if (ankiSchema.tagNames) {
    ankiSchema.tagNames = ankiSchema.tagNames.filter(tag =>
        tag !== 'script' && tag !== 'iframe' && tag !== 'object' && tag !== 'embed'
    );
}

// Remover event handlers
if (ankiSchema.attributes && ankiSchema.attributes['*']) {
    ankiSchema.attributes['*'] = ankiSchema.attributes['*'].filter(attr =>
        !attr.startsWith('on') // Remove onclick, onload, etc.
    );
}

/**
 * Renderizar Markdown para HTML (web - restritivo)
 */
export async function renderMarkdown(md: string): Promise<string> {
    const result = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkRehype)
        .use(rehypeKatex)
        .use(rehypeSanitize, webSchema)
        .use(rehypeStringify)
        .process(md);

    return result.toString();
}

/**
 * Renderizar Markdown para HTML (Anki - menos restritivo MAS sem <script>)
 */
export async function renderMarkdownForAnki(md: string): Promise<string> {
    const result = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkRehype)
        .use(rehypeKatex)
        .use(rehypeSanitize, ankiSchema) // Schema customizado
        .use(rehypeStringify)
        .process(md);

    return result.toString();
}
