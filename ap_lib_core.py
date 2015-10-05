# -*- coding: utf-8 -*-
"""
Created on Mon Sep 14 10:55:45 2015

@author: atomberg
"""

import urllib, re, shelve, gdbm
import math
import numpy as np
import pandas as pd  
import nltk
from sklearn.utils import resample
from flask import Markup 

def gdbm_shelve(filename, flag="c"): 
    return shelve.Shelf(gdbm.open(filename, flag)) 

def text_to_sentence_list(text):
    sent_detector = nltk.data.load('tokenizers/punkt/english.pickle')
    return sent_detector.tokenize(text)

def boldify(token, text):
    r = re.compile("[\W]" + token + "[\W]", re.IGNORECASE) 
    return Markup(r.sub(' <span class="badge"><big>%s</big></span> ' % token, text))

def get_random_snippet_sent(sentence_list, token): 
    target = resample([s for s in sentence_list if token in s.lower()], n_samples = 1)[0]
    idx = sentence_list.index(target)   
    return boldify(token, " ".join(sentence_list[max(idx - 1,0) : idx + 2]))

def get_all_snippets_sent(sentence_list, token): 
    targets = [s for s in sentence_list if token in s.lower()]
    indices = [sentence_list.index(t) for t in targets] 
    snippets = [" ".join(sentence_list[max(idx - 1,0) : idx + 2]) for idx in indices]   
    return [boldify(token, snip) for snip in snippets]

def get_reviews_containing_token (reviews_df, vectorizer, features, token):
    index_of_token = vectorizer.get_feature_names().index(token)
    docs_containing_token = features[index_of_token].nonzero()[1]
    return reviews_df.iloc[docs_containing_token]

def build_snippets_dict (reviews_df, vectorizer, features, token):
    chunk = get_reviews_containing_token(reviews_df, vectorizer, features, token)
    pos_snippets = []
    neg_snippets = []
    for ri, row in chunk[chunk['Positive']].iterrows():
        slist = text_to_sentence_list(row['Content'].replace('.', '. '))
        result = get_all_snippets_sent(slist, token)
#        if result != []:
        pos_snippets = pos_snippets + result
    for ri, row in chunk[~chunk['Positive']].iterrows():
        slist = text_to_sentence_list(row['Content'].replace('.', '. '))
        result = get_all_snippets_sent(slist, token)
#        if result != []:
        neg_snippets = neg_snippets + result
    return {"positive" : pos_snippets, "negative": neg_snippets}

def pmi_from_counts(passage_count, passage_len, corpus_count, corpus_len):
	try:
		return math.log(passage_count / corpus_count * (corpus_len / passage_len) ** 2) 
	except:
		return np.nan        
    
def get_product_reviews_from_db(product_id, db_connection):
    "Returns a pandas dataframe with info pulled from the database."
    query = "SELECT * FROM reviews WHERE ProductID = '%s'" % product_id
    return pd.read_sql(sql = query, con = db_connection, index_col='index')
    
def get_reviews_df (product_id, db_connection_engine):
    "Load the reviews associated with the product_id into a dataframe."
    reviews_df = get_product_reviews_from_db(product_id, db_connection_engine)
    reviews_df['Positive'] = reviews_df['Overall'].map(int) > 3
    return reviews_df
    
def build_words_df (vectorizer, features, positive_reviews_vector):
    '''Buid a dataframe of tokens and their counts/scores
    using the vectorizer and features provided.'''
    words_df = pd.DataFrame(index = vectorizer.get_feature_names())
    words_df.index.name = 'tokens'

    words_df['tot_count'] = features.dot(np.ones(len(positive_reviews_vector)))
    words_df['pos_count'] = features.dot(positive_reviews_vector)
    words_df['neg_count'] = features.dot(np.ones(len(positive_reviews_vector)) 
                                         - positive_reviews_vector)
    vocabulary_size = words_df.sum()
    
    # pmi analysis and scoring
    words_df['pos_pmi'] = words_df.apply(lambda x: pmi_from_counts(x['pos_count'], 
        vocabulary_size['pos_count'], x['tot_count'], vocabulary_size['tot_count']), axis = 1)
    words_df['neg_pmi'] = words_df.apply(lambda x: pmi_from_counts(x['neg_count'], 
        vocabulary_size['neg_count'], x['tot_count'], vocabulary_size['tot_count']), axis = 1)
    words_df['score'] = words_df['pos_pmi'].fillna(0) - words_df['neg_pmi'].fillna(0)
    
    return words_df
    
def links_to_all_reviews (product_id):
    def link_to_all_reviews (keyword):
        return "reviews/" + product_id + "?" + urllib.urlencode({'keyword': keyword})
    return link_to_all_reviews
