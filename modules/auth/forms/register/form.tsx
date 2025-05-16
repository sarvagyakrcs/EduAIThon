"use client";
import React from "react";
import { IconBrandGithub, IconBrandGoogle, IconLoader } from "@tabler/icons-react";
import { Field, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PROJECT_NAME } from "@/metadata";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  RegisterSchema,
  RegisterSchemaType,
} from "@/schema/auth/register-schema";
import { useMutation } from "@tanstack/react-query";
import {Register} from "@/actions/auth";

export default function FormSignUp() {
  const {
    handleSubmit,
    formState: { errors },
    register,
    reset,
  } = useForm<RegisterSchemaType>({
    resolver: zodResolver(RegisterSchema),
  });

  const {
    mutate: registerUser,
    isPending
  } = useMutation({
    mutationKey: ['register'],
    mutationFn: Register,
    onMutate: () => {
      toast.loading("Creating your account", { id: "register" });
    },
    onSuccess: (data) => {
      toast.success(data.success, { id: "register" });
      reset();
    },
    onError: () => {
      toast.error("Something went wrong", { id: "register" });
    }
  })

  const onSubmit = (data: RegisterSchemaType) => {
    registerUser(data);
  };
  return (
    <div className="shadow-input mx-auto w-full max-w-md rounded-none p-4 md:p-8">
      <h2 className="text-xl font-bold">Welcome to {PROJECT_NAME}</h2>
      <p className="mt-2 max-w-sm text-sm">
        Sign Up to {PROJECT_NAME.toLocaleLowerCase()} if you can because we
        don&apos;t have a login flow yet
      </p>
      <form className="mt-8" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
          <Field className="w-full">
            <Label htmlFor="firstname">First name</Label>
            <Input
              {...register("firstName")}
              id="firstname"
              placeholder="Tyler"
              type="text"
            />
            {errors.firstName && (
              <p className="dark:text-red-300 text-red-800 text-sm mt-1">
                {errors.firstName.message}
              </p>
            )}
          </Field>
          <Field className="w-full">
            <Label htmlFor="lastname">Last name</Label>
            <Input
              {...register("lastName")}
              id="lastname"
              placeholder="Durden"
              type="text"
            />
            {errors.lastName && (
              <p className="dark:text-red-300 text-red-800 text-sm mt-1">
                {errors.lastName.message}
              </p>
            )}
          </Field>
        </div>
        <Field className="my-4">
          <Label htmlFor="email">Email Address</Label>
          <Input
            {...register("email", { required: "Email is required" })}
            id="email"
            placeholder="projectmayhem@fc.com"
            type="email"
          />
          {errors.email && (
            <p className="dark:text-red-300 text-red-800 text-sm mt-1">
              {errors.email.message}
            </p>
          )}
        </Field>
        <Field className="my-4">
          <Label htmlFor="password">Password</Label>
          <Input
            {...register("password")}
            id="password"
            placeholder="••••••••"
            type="password"
          />
          {errors.password && (
            <p className="dark:text-red-300 text-red-800 text-sm mt-1">
              {errors.password.message}
            </p>
          )}
        </Field>
        <Button disabled={isPending} type="submit" className="w-full cursor-pointer mt-6">
          { isPending ? <IconLoader size={22} className="animate-spin" />: "Sign up" }
        </Button>

        <div className="my-8 h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent dark:via-neutral-700" />

        <div className="flex w-full items-center justify-between space-x-4">
          <Button disabled={isPending} className="w-full cursor-pointer" outline>
            {" "}
            <IconBrandGoogle size={22} />{" "}
          </Button>
          <Button disabled={isPending} className="w-full cursor-pointer" outline>
            {" "}
            <IconBrandGithub size={22} />{" "}
          </Button>
        </div>
      </form>
    </div>
  );
}
