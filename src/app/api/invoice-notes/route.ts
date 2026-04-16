import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Fetch all notes for an invoice
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');

    if (!invoiceId) {
      return NextResponse.json({ error: 'معرف الفاتورة مطلوب' }, { status: 400 });
    }

    const notes = await db.invoiceNote.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Invoice notes GET error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب الملاحظات' },
      { status: 500 }
    );
  }
}

// POST: Create a new note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, content } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: 'معرف الفاتورة مطلوب' }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'المحتوى لا يمكن أن يكون فارغاً' },
        { status: 400 }
      );
    }

    if (content.trim().length > 500) {
      return NextResponse.json(
        { error: 'المحتوى لا يمكن أن يتجاوز 500 حرف' },
        { status: 400 }
      );
    }

    // Verify invoice exists
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });
    }

    const note = await db.invoiceNote.create({
      data: {
        invoiceId,
        content: content.trim(),
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Invoice notes POST error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إنشاء الملاحظة' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a note
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json({ error: 'معرف الملاحظة مطلوب' }, { status: 400 });
    }

    // Verify note exists
    const note = await db.invoiceNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return NextResponse.json({ error: 'الملاحظة غير موجودة' }, { status: 404 });
    }

    await db.invoiceNote.delete({
      where: { id: noteId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Invoice notes DELETE error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حذف الملاحظة' },
      { status: 500 }
    );
  }
}
