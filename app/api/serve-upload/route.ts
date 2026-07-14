import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function removeVietnameseTones(str: string) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const target = url.searchParams.get('path');
  
  if (!target || !target.startsWith('/uploads/')) {
    return new NextResponse('Bad request', { status: 400 });
  }

  const parts = target.split('/');
  if (parts.length >= 4) {
    const reqFolder = decodeURIComponent(parts[2]);
    const fileName = parts.slice(3).join('/');
    
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (fs.existsSync(uploadsDir)) {
        const folders = fs.readdirSync(uploadsDir);
        const reqNorm = removeVietnameseTones(reqFolder).toLowerCase();
        
        for (const f of folders) {
          if (removeVietnameseTones(f).toLowerCase() === reqNorm) {
             // Redirect to the actual path found on disk
             return NextResponse.redirect(new URL(`/uploads/${encodeURIComponent(f)}/${fileName}`, req.url));
          }
        }
      }
    } catch(e) {
      console.error('Error reading uploads directory', e);
    }
  }

  // Fallback
  return NextResponse.redirect(new URL(target, req.url));
}
