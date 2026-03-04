import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  email!: string;

  @Column({ type: "varchar" })
  password!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar", default: "company" }) // company or contractor
  type!: string;

  @Column({ type: "varchar", default: "operator" }) // we will refine roles later
  role!: string;

  @Column({ type: "varchar", nullable: true })
  lotoId?: string;

  @Column({ type: "varchar", nullable: true })
  contractorNumber?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
