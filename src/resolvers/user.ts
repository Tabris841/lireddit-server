import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from 'type-graphql';
import argon2 from 'argon2';
import { EntityManager } from '@mikro-orm/postgresql';

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
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req, em }: MyContext): Promise<User | null> {
    if (!req.session!.userId) {
      return null;
    }

    const user = await em.findOne(User, { id: req.session!.userId });
    return user;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UserNamePasswordInput,
    @Ctx() { em, req }: MyContext
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
    let user;

    try {
      const result = await (em as EntityManager)
        .createQueryBuilder(User)
        .getKnexQuery()
        .insert({
          user_name: options.userName,
          password: hashedPassword,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');

      user = result[0];
    } catch (err) {
      console.log('REGISTER FAIL: ', err);
      if (err.code === '23505') {
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

    req.session!.userId = user.id;

    console.log(user);

    return {
      user: {
        id: user.id,
        userName: user.user_name,
        password: user.password,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('options') options: UserNamePasswordInput,
    @Ctx() { em, req }: MyContext
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

    req.session!.userId = user.id;

    return {
      user,
    };
  }
}
