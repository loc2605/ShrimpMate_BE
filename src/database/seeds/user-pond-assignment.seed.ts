import { DataSource } from 'typeorm';

export async function seedUserPondAssignments(_dataSource: DataSource) {
  // Ponds are now directly owned through Farm.ownerId (Farmer)
  return;
}

