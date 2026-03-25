import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { RunExportContent, RunExportSection } from "@/lib/results/format";

function buildBodyParagraph(text: string) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: 22,
      }),
    ],
    spacing: {
      after: 120,
    },
  });
}

function buildSectionHeading(title: string) {
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 28,
      }),
    ],
    spacing: {
      before: 320,
      after: 120,
    },
  });
}

function buildItemParagraphs(section: Exclude<RunExportSection, { kind: "paragraphs" }>) {
  return section.items.flatMap((item) => [
    new Paragraph({
      children: [
        new TextRun({
          text: item.title,
          bold: true,
          size: 22,
        }),
      ],
      spacing: {
        after: 60,
      },
    }),
    ...item.lines.map(buildBodyParagraph),
  ]);
}

function buildCalendarTable(content: RunExportContent) {
  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: ["Day", "Platform", "Angle", "CTA"].map(
          (label) =>
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: label,
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
              ],
              shading: {
                fill: "F2ECE4",
              },
            }),
        ),
      }),
      ...content.formattedOutput.calendarEntries.map(
        (entry) =>
          new TableRow({
            children: [entry.day, entry.platform, entry.angle, entry.callToAction].map(
              (value) =>
                new TableCell({
                  verticalAlign: VerticalAlign.CENTER,
                  children: [buildBodyParagraph(value)],
                }),
            ),
          }),
      ),
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "D9D0C6" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "D9D0C6" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "D9D0C6" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "D9D0C6" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E7DED6" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E7DED6" },
    },
  });
}

export async function buildRunDocxBuffer(content: RunExportContent) {
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: content.title,
          bold: true,
          size: 40,
        }),
      ],
      spacing: {
        after: 120,
      },
    }),
  ];

  if (content.workspaceLabel) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: content.workspaceLabel,
            italics: true,
            size: 22,
          }),
        ],
        spacing: {
          after: 80,
        },
      }),
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: content.generatedLabel,
          size: 20,
        }),
      ],
      spacing: {
        after: 220,
      },
    }),
  );

  for (const section of content.sections) {
    children.push(buildSectionHeading(section.title));

    if (section.key === "calendar") {
      children.push(buildCalendarTable(content));
      continue;
    }

    if (section.kind === "paragraphs") {
      children.push(...section.paragraphs.map(buildBodyParagraph));
      continue;
    }

    children.push(...buildItemParagraphs(section));
  }

  const document = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}
