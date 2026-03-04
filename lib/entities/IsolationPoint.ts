import "reflect-metadata";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("isolation_points")
export class IsolationPoint {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  taskId!: string; // FK to LotoTask.id

  @Column({ type: "int" })
  tagNo!: number; // 1 to N

  @Column({ type: "varchar", nullable: true })
  isolationDescription?: string;

  @Column({ type: "varchar", nullable: true })
  normalPosition?: string; // CLOSE | OPEN | INSTALLED | REMOVED

  @Column({ type: "varchar", nullable: true })
  requiredPosition?: string; // CLOSE | OPEN | REMOVED

  // --- Operator fills these ---
  @Column({ type: "varchar", nullable: true })
  lockNumber?: string;

  @Column({ type: "varchar", nullable: true })
  isolationPosition?: string; // CLOSE | OPEN | REMOVED

  // Auto-filled when operator fills the row
  @Column({ type: "varchar", nullable: true })
  lockOnInitial1?: string; // "Mike Johnson – 2026-02-16 09:15"

  // Auto-filled when supervisor verifies
  @Column({ type: "varchar", nullable: true })
  lockOnInitial2?: string; // "Lisa Chen – 2026-02-16 10:45"

  // Re-energization
  @Column({ type: "varchar", nullable: true })
  returnedToServiceInitial?: string;

  @Column({ type: "varchar", nullable: true })
  returnedAt?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
