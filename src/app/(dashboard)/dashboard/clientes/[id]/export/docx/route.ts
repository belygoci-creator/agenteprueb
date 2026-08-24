import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { NextResponse } from "next/server";

import { obtenerClienteCompleto } from "@/lib/clientes/obtener-cliente-completo";
import { construirReporte, nombreArchivoSeguro } from "@/lib/clientes/reporte";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const datos = await obtenerClienteCompleto(id);

  if (!datos.cliente) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  }

  const reporte = construirReporte(datos);

  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun(reporte.nombreCliente)],
    }),
    new Paragraph({
      children: [new TextRun({ text: `Generado el ${reporte.generadoEl}`, italics: true, color: "666666" })],
      spacing: { after: 300 },
    }),
  ];

  for (const seccion of reporte.secciones) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(seccion.titulo)],
        spacing: { before: 300, after: 150 },
      })
    );
    for (const item of seccion.items) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${item.label}: `, bold: true }), new TextRun(item.valor)],
        })
      );
    }
    if (seccion.notas) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Notas: ", bold: true }), new TextRun(seccion.notas)],
          spacing: { before: 100 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nombreArchivoSeguro(reporte.nombreCliente)}.docx"`,
    },
  });
}
