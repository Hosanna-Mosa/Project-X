import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { Order } from "./Order";

export enum StopType {
  PICKUP = "PICKUP",
  DROP = "DROP",
}

@Entity("stops")
export class Stop {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Order, (order) => order.stops)
  order!: Order;

  @Column()
  sequence!: number;

  @Column({ type: "float" })
  latitude!: number;

  @Column({ type: "float" })
  longitude!: number;

  @Column({ type: "text", nullable: true })
  address!: string;

  @Column({
    type: "enum",
    enum: StopType,
  })
  type!: StopType;

  @Column({ type: "jsonb", nullable: true })
  items!: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
