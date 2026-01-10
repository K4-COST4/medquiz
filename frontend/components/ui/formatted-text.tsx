import React from 'react';

export function FormattedText({ text, className = "" }: { text: string, className?: string }) {
    if (!text) return null;

    let processed = text.replace(/\$([^\$]+)\$/g, (match, content) => {
        content = content.replace(/\^\{([^\}]+)\}/g, "<sup>$1</sup>");
        content = content.replace(/_\{([^\}]+)\}/g, "<sub>$1</sub>");
        content = content.replace(/\^([0-9\+\-]+)/g, "<sup>$1</sup>");
        return `<span class="font-serif italic">${content}</span>`;
    });

    processed = processed
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>");

    return (
        <span
            className={className}
            dangerouslySetInnerHTML={{ __html: processed }}
        />
    );
}
