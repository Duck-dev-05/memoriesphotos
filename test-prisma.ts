import { prisma } from './lib/prisma';
async function test() {
  try {
    await prisma.user.findFirst();
    console.log('success');
  } catch (e) {
    console.error('ERROR', e);
  }
}
test();
