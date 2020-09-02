import { Field, InputType } from 'type-graphql';

@InputType()
export class UserNamePasswordInput {
  @Field()
  userName: string;

  @Field()
  password: string;

  @Field()
  email: string;
}
