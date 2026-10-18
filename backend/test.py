class Animal:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age

    def do_sound(self):
        print(f"{self.name}: ...")

class Dog(Animal):
    def do_sound(self):
        print(f"{self.name}: bark")

class Cat(Animal):
    def do_sound(self):
        print(f"{self.name}: meow")

    def eat(self):
        print(f"{self.name} is eating")

class Tiger(Cat):
    def do_sound(self):
        print(f"{self.name}: RRRRRR")


cat = Tiger("Bobik", 3)
cat.eat()
