import { article } from "./article";
import { author } from "./author";
import { category } from "./category";
import { embed, tableBlock } from "./objects";
import { subscriber } from "./subscriber";
import { visit } from "./visit";

export const schemaTypes = [author, category, article, subscriber, visit, embed, tableBlock];
