import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction, UpgradePolicy } from '@mysten/sui/transactions';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN_KEY = process.env.ADMIN_PRIVATE_KEY!;
const UPGRADE_CAP_ID = '0x959ad9d444081d882890d69710b4329bb1e0f9962b4fee13c4e0a9617335d239';
const PACKAGE_ID = '0x737324ddac9fb96e3d7ffab524f5489c1a0b3e5b4bffa2f244303005001b4ada';

async function main() {
  const client = new SuiClient({ url: getFullnodeUrl('mainnet') });
  const keypair = Ed25519Keypair.fromSecretKey(ADMIN_KEY);
  
  console.log('Admin address:', keypair.toSuiAddress());
  
  const buildDir = path.join(process.cwd(), 'build/suibets/bytecode_modules');
  const moduleFiles = fs.readdirSync(buildDir).filter(f => f.endsWith('.mv'));
  const modules = moduleFiles.map(f => {
    const bytes = fs.readFileSync(path.join(buildDir, f));
    return Array.from(bytes);
  });
  
  console.log('Modules:', moduleFiles, 'sizes:', modules.map(m => m.length));
  
  const deps = [
    '0x0000000000000000000000000000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000000000000000000000000000002',
    '0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285',
  ];
  
  // Use the exact digest from the validator's error message
  const digest = [51, 39, 113, 3, 85, 150, 112, 5, 92, 255, 166, 175, 74, 232, 96, 244, 240, 35, 122, 131, 33, 78, 251, 152, 40, 137, 115, 12, 166, 46, 147, 234];
  console.log('Using digest:', Buffer.from(digest).toString('hex'));
  
  const tx = new Transaction();
  
  const ticket = tx.upgrade({
    modules,
    dependencies: deps,
    package: PACKAGE_ID,
    ticket: tx.moveCall({
      target: '0x2::package::authorize_upgrade',
      arguments: [
        tx.object(UPGRADE_CAP_ID),
        tx.pure.u8(UpgradePolicy.COMPATIBLE),
        tx.pure.vector('u8', digest),
      ],
    }),
  });
  
  tx.moveCall({
    target: '0x2::package::commit_upgrade',
    arguments: [
      tx.object(UPGRADE_CAP_ID),
      ticket,
    ],
  });
  
  tx.setGasBudget(500_000_000);
  
  console.log('Submitting upgrade transaction...');
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true, showObjectChanges: true },
  });
  
  console.log('TX Hash:', result.digest);
  console.log('Status:', JSON.stringify(result.effects?.status));
  
  if (result.objectChanges) {
    for (const change of result.objectChanges) {
      if (change.type === 'published') {
        console.log('NEW PACKAGE ID:', change.packageId);
      }
    }
  }
}

main().catch(console.error);
