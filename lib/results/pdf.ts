import PDFDocument from "pdfkit";
import { Buffer } from "node:buffer";
import type { RunExportContent, RunExportSection } from "@/lib/results/format";

function writeSectionHeading(doc: PDFKit.PDFDocument, title: string) {
  doc
    .moveDown(1.25)
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor("#231f1b")
    .text(title, {
      paragraphGap: 6,
    });
}

function writeSectionBody(doc: PDFKit.PDFDocument, section: RunExportSection) {
  if (section.kind === "paragraphs") {
    for (const paragraph of section.paragraphs) {
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#3f3832")
        .text(paragraph, {
          paragraphGap: 10,
          lineGap: 3,
        });
    }

    return;
  }

  for (const item of section.items) {
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#231f1b")
      .text(item.title, {
        paragraphGap: 4,
      });

    for (const line of item.lines) {
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#3f3832")
        .text(line, {
          indent: 14,
          paragraphGap: 6,
          lineGap: 3,
        });
    }

    doc.moveDown(0.35);
  }
}

export async function buildRunPdfBuffer(content: RunExportContent): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "LETTER",
      margin: 54,
      compress: false,
      info: {
        Title: content.title,
        Subject: "Content plan export",
      },
    });
    const chunks: Buffer[] = [];

    document.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    document.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    document.on("error", reject);

    document
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor("#231f1b")
      .text(content.title);

    if (content.workspaceLabel) {
      document
        .moveDown(0.3)
        .font("Helvetica-Oblique")
        .fontSize(10)
        .fillColor("#6b6259")
        .text(content.workspaceLabel);
    }

    document
      .moveDown(0.3)
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#6b6259")
      .text(content.generatedLabel);

    for (const section of content.sections) {
      writeSectionHeading(document, section.title);
      writeSectionBody(document, section);
    }

    document.end();
  });
}
