import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from "typeorm";
import { User } from "./User";
import { Driver } from "./Driver";
import { Stop } from "./Stop";

export enum OrderStatus {
  CREATED = "CREATED",
  SEARCHING_DRIVER = "SEARCHING_DRIVER",
  DRIVER_ASSIGNED = "DRIVER_ASSIGNED",
  PICKING_ITEMS = "PICKING_ITEMS",
  ON_THE_WAY = "ON_THE_WAY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Driver, { nullable: true })
  driver?: Driver;

  @Column({
    type: "enum",
    enum: OrderStatus,
    default: OrderStatus.CREATED,
  })
  status!: OrderStatus;

  @Column({ type: "float", default: 0 })
  totalDistance!: number;

  @Column({ type: "float", default: 0 })
  totalPrice!: number;

  @OneToMany(() => Stop, (stop) => stop.order, { cascade: true })
  stops!: Stop[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
