'use strict';
// Biblioteca para gerar os documentos .docx do projeto (docx-js): estilos, capa, sumário clicável, tabelas, listas e rodapé.
// Os conteúdos ficam em tecnica.js e funcional.js; build.js grava os arquivos em docs/.
const fs = require('node:fs');
const path = require('node:path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType,
  LevelFormat, Footer, Header, PageNumber, TabStopType, PageBreak, Bookmark, InternalHyperlink, ImageRun, VerticalAlign,
} = require('docx');

const COLORS = { dark: '1B3936', brand: '1F6F5C', soft: 'E2F1ED', line: 'C9D6D2', text: '1C2630', mute: '5B6B7F', code: 'F1F4F3', warn: 'FDF1DC', warnLine: 'E0A64B', info: 'E8EEFC', infoLine: '6E8FE0' };
const FONT = 'Calibri';
const MONO = 'Consolas';
const PAGE = { width: 11906, height: 16838, margin: 1134 }; // A4, margens de 2 cm
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2; // 9638 DXA

const cell = (children, { width, fill, bold, color, align } = {}) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  verticalAlign: VerticalAlign.TOP,
  margins: { top: 70, bottom: 70, left: 110, right: 110 },
  shading: fill ? { type: ShadingType.CLEAR, fill, color: 'auto' } : undefined,
  borders: ['top', 'bottom', 'left', 'right'].reduce((b, side) => ({ ...b, [side]: { style: BorderStyle.SINGLE, size: 4, color: COLORS.line } }), {}),
  children: (Array.isArray(children) ? children : [children]).map((c) => (typeof c === 'string' ? para(c, { size: 19, bold, color, align, after: 0 }) : c)),
});

/** Texto com marcação simples: **negrito**, {{código}} e _itálico_ (somente entre espaços/pontuação). */
function runs(text, base = {}) {
  const out = [];
  const regex = /(\*\*[^*]+\*\*|\{\{[^}]+\}\})/g;
  String(text).split(regex).filter((s) => s !== '').forEach((part) => {
    if (part.startsWith('**')) out.push(new TextRun({ ...base, text: part.slice(2, -2), bold: true }));
    else if (part.startsWith('{{')) out.push(new TextRun({ ...base, text: part.slice(2, -2), font: MONO, size: (base.size || 21) - 2, shading: { type: ShadingType.CLEAR, fill: COLORS.code, color: 'auto' } }));
    else out.push(new TextRun({ ...base, text: part }));
  });
  return out;
}

function para(text, { size = 21, bold, color = COLORS.text, align, after = 120, before = 0, keepNext, indent } = {}) {
  return new Paragraph({
    alignment: align,
    keepNext,
    indent,
    spacing: { after, before, line: 288 },
    children: runs(text, { size, bold, color, font: FONT }),
  });
}

class DocBuilder {
  /** @param {{titulo:string, subtitulo:string, tipo:string, versaoDoc:string, versaoSistema:string, data:string, autor:string, logo?:string}} meta */
  constructor(meta) {
    this.meta = meta;
    this.body = [];
    this.toc = [];
    this.numberings = [];
    this.counters = [0, 0, 0];
    this.bookmarkId = 0;
  }

  #heading(level, text) {
    this.counters[level - 1] += 1;
    for (let i = level; i < 3; i++) this.counters[i] = 0;
    const number = this.counters.slice(0, level).join('.');
    const label = `${number}  ${text}`;
    const id = `sec_${number.replace(/\./g, '_')}`;
    this.toc.push({ level, label, id });
    this.body.push(new Paragraph({
      heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][level - 1],
      keepNext: true,
      pageBreakBefore: level === 1 && this.toc.filter((t) => t.level === 1).length > 1,
      children: [new Bookmark({ id, children: [new TextRun({ text: label })] })],
    }));
    return this;
  }

  h1(text) { return this.#heading(1, text); }
  h2(text) { return this.#heading(2, text); }
  h3(text) { return this.#heading(3, text); }

  p(text, opts) { this.body.push(para(text, opts)); return this; }

  bullets(items) {
    items.forEach((item) => this.body.push(new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 70, line: 276 }, children: runs(item, { size: 21, font: FONT, color: COLORS.text }) })));
    this.body.push(para('', { after: 60 }));
    return this;
  }

  numbered(items) {
    const reference = `num_${this.numberings.length}`;
    this.numberings.push({
      reference, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }],
    });
    items.forEach((item) => this.body.push(new Paragraph({ numbering: { reference, level: 0 }, spacing: { after: 70, line: 276 }, children: runs(item, { size: 21, font: FONT, color: COLORS.text }) })));
    this.body.push(para('', { after: 60 }));
    return this;
  }

  /** @param {string[]} head @param {string[][]} rows @param {number[]} widths proporções (normalizadas para a largura útil) */
  table(head, rows, widths) {
    const total = widths.reduce((a, b) => a + b, 0);
    const sizes = widths.map((w) => Math.floor((w / total) * CONTENT_WIDTH));
    sizes[sizes.length - 1] += CONTENT_WIDTH - sizes.reduce((a, b) => a + b, 0);
    this.body.push(new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: sizes,
      rows: [
        new TableRow({ tableHeader: true, cantSplit: true, children: head.map((h, i) => cell(h, { width: sizes[i], fill: COLORS.dark, bold: true, color: 'FFFFFF' })) }),
        ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, { width: sizes[i], fill: ri % 2 ? 'F6F9F8' : undefined })) })),
      ],
    }));
    this.body.push(para('', { after: 140 }));
    return this;
  }

  /** Quadro de destaque. tone: 'info' | 'warn' */
  note(title, text, tone = 'info') {
    const fill = tone === 'warn' ? COLORS.warn : COLORS.info;
    const line = tone === 'warn' ? COLORS.warnLine : COLORS.infoLine;
    this.body.push(new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [CONTENT_WIDTH],
      rows: [new TableRow({
        cantSplit: true,
        children: [new TableCell({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill, color: 'auto' },
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          borders: {
            left: { style: BorderStyle.SINGLE, size: 24, color: line },
            top: { style: BorderStyle.NONE, size: 0, color: 'auto' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' }, right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
          },
          children: [para(`**${title}**`, { size: 20, after: 40 }), ...(Array.isArray(text) ? text : [text]).map((t) => para(t, { size: 20, after: 40 }))],
        })],
      })],
    }));
    this.body.push(para('', { after: 140 }));
    return this;
  }

  code(text) {
    text.split('\n').forEach((line, i, all) => this.body.push(new Paragraph({
      spacing: { after: i === all.length - 1 ? 160 : 0, line: 252 },
      shading: { type: ShadingType.CLEAR, fill: COLORS.code, color: 'auto' },
      indent: { left: 120, right: 120 },
      border: i === 0 ? { top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.line } } : undefined,
      children: [new TextRun({ text: line === '' ? ' ' : line, font: MONO, size: 17, color: COLORS.text })],
    })));
    return this;
  }

  /** Sumário com links clicáveis para cada título (sem números de página, para funcionar em qualquer leitor). */
  #contents() {
    const items = this.toc.filter((t) => t.level <= 2);
    return [
      new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 200 }, children: [new TextRun({ text: 'Sumário', font: FONT, size: 36, bold: true, color: COLORS.dark })] }),
      ...items.map((t) => new Paragraph({
        spacing: { after: t.level === 1 ? 60 : 30, before: t.level === 1 ? 100 : 0 },
        indent: { left: t.level === 1 ? 0 : 480 },
        children: [new InternalHyperlink({ anchor: t.id, children: [new TextRun({ text: t.label, font: FONT, size: t.level === 1 ? 22 : 20, bold: t.level === 1, color: t.level === 1 ? COLORS.dark : COLORS.text, style: 'Hyperlink' })] })],
      })),
    ];
  }

  #cover() {
    const m = this.meta;
    const rule = { bottom: { style: BorderStyle.SINGLE, size: 18, color: COLORS.brand, space: 8 } };
    const info = [['Documento', m.tipo], ['Sistema', `CCP — Controle de Contas a Pagar, versão ${m.versaoSistema}`], ['Versão do documento', m.versaoDoc], ['Data', m.data], ['Autor', m.autor], ['Cliente', 'JRP Engenharia e Projetos']];
    const infoSizes = [2600, CONTENT_WIDTH - 2600];
    return [
      ...(m.logo ? [new Paragraph({ spacing: { before: 600, after: 200 }, children: [new ImageRun({ type: 'png', data: fs.readFileSync(m.logo), transformation: { width: 130, height: 130 } })] })] : []),
      new Paragraph({ spacing: { before: m.logo ? 200 : 2400, after: 120 }, children: [new TextRun({ text: m.tipo.toUpperCase(), font: FONT, size: 22, bold: true, color: COLORS.brand, characterSpacing: 60 })] }),
      new Paragraph({ spacing: { after: 160 }, border: rule, children: [new TextRun({ text: m.titulo, font: FONT, size: 60, bold: true, color: COLORS.dark })] }),
      new Paragraph({ spacing: { after: 700 }, children: [new TextRun({ text: m.subtitulo, font: FONT, size: 28, color: COLORS.mute })] }),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: infoSizes,
        rows: info.map(([k, v]) => new TableRow({ children: [cell(k, { width: infoSizes[0], fill: COLORS.soft, bold: true }), cell(v, { width: infoSizes[1] })] })),
      }),
      new Paragraph({ spacing: { before: 900 }, children: [new TextRun({ text: 'Desenvolvido por Kaio Gomes — kaio-gomes-site.vercel.app', font: FONT, size: 19, color: COLORS.mute })] }),
    ];
  }

  async save(file) {
    const m = this.meta;
    const bulletLevel = { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } };
    const headingStyle = (id, size, color, before, after) => ({ id, name: id, basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size, bold: true, color }, paragraph: { spacing: { before, after }, outlineLevel: Number(id.slice(-1)) - 1 } });
    const doc = new Document({
      creator: m.autor, title: `${m.titulo} — ${m.tipo}`, description: m.subtitulo,
      styles: {
        default: { document: { run: { font: FONT, size: 21, color: COLORS.text } } },
        paragraphStyles: [
          headingStyle('Heading1', 34, COLORS.dark, 360, 160),
          headingStyle('Heading2', 27, COLORS.brand, 280, 120),
          headingStyle('Heading3', 23, COLORS.dark, 220, 100),
        ],
        characterStyles: [{ id: 'Hyperlink', name: 'Hyperlink', run: { color: COLORS.brand, underline: {} } }],
      },
      numbering: { config: [{ reference: 'bullets', levels: [bulletLevel] }, ...this.numberings] },
      sections: [
        { properties: { page: { size: { width: PAGE.width, height: PAGE.height }, margin: { top: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin, right: PAGE.margin } } }, children: this.#cover() },
        {
          properties: { page: { size: { width: PAGE.width, height: PAGE.height }, margin: { top: PAGE.margin + 200, bottom: PAGE.margin, left: PAGE.margin, right: PAGE.margin } } },
          headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.line, space: 4 } }, children: [new TextRun({ text: `JRP Engenharia · CCP — ${m.tipo}`, font: FONT, size: 17, color: COLORS.mute })] })] }) },
          footers: {
            default: new Footer({
              children: [new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
                children: [
                  new TextRun({ text: `${m.titulo} · v${m.versaoSistema} · doc ${m.versaoDoc}`, font: FONT, size: 17, color: COLORS.mute }),
                  new TextRun({ text: '\tPágina ', font: FONT, size: 17, color: COLORS.mute }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 17, color: COLORS.mute }),
                  new TextRun({ text: ' de ', font: FONT, size: 17, color: COLORS.mute }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 17, color: COLORS.mute }),
                ],
              })],
            }),
          },
          children: [...this.#contents(), new Paragraph({ children: [new PageBreak()] }), ...this.body],
        },
      ],
    });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, await Packer.toBuffer(doc));
    return file;
  }
}

module.exports = { DocBuilder, COLORS };
