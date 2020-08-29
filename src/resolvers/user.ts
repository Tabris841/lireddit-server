import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Resolver,
} from 'type-graphql';
import argon2 from 'argon2';

import { MyContext } from '../types';
import { User } from '../entities/User';

@InputType()
class UserNamePasswordInput {
  @Field()
  userName: string;

  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UserNamePasswordInput,
    @Ctx() { em }: MyContext
  ): Promise<UserResponse> {
    if (options.userName.length <= 2) {
      return {
        errors: [
          { field: 'userName', message: `length must be greater than 2` },
        ],
      };
    }

    if (options.password.length <= 3) {
      return {
        errors: [
          { field: 'password', message: `length must be greater than 3` },
        ],
      };
    }

    const hashedPassword = await argon2.hash(options.password);
    const user = em.create(User, {
      userName: options.userName,
      password: hashedPassword,
    });

    try {
      await em.persistAndFlush(user);
    } catch (e) {
      console.log('REGISTER FAIL: ', e.message);
      if (e.code === '23505') {
        return {
          errors: [
            {
              field: 'userName',
              message: 'userName already exists',
            },
          ],
        };
      }
    }

    return {
      user,
    };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('options') options: UserNamePasswordInput,
    @Ctx() { em }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { userName: options.userName });
    if (!user) {
      return {
        errors: [{ field: 'userName', message: `username doesn't exist` }],
      };
    }

    const valid = await argon2.verify(user.password, options.password);
    if (!valid) {
      return {
        errors: [{ field: 'password', message: `incorrect password` }],
      };
    }

    return {
      user,
    };
  }
}
