from flask import render_template, request, Markup, jsonify
from app import app

import re
import urllib

from ap_lib_core import *

from sqlalchemy import create_engine
from sklearn.feature_extraction.text import CountVectorizer

#from a_Model import ModelIt

db_connection_engine = create_engine('mysql://dummy:12345@127.0.0.1/amazon_reviews?charset=utf8')

@app.route('/')
@app.route('/index')
def index():
	return render_template("input.html")

@app.route('/product/<path:product_id>')
def get_product_results(product_id):
    reviews_df = get_reviews_df(product_id, db_connection_engine)
    
    vec = CountVectorizer(stop_words = 'english', encoding = 'utf8',
                      ngram_range = (1,2), token_pattern = "[a-zA-Z\'_]+", 
                      min_df = 2, binary = True)                      
    features = vec.fit_transform(reviews_df['Content']).transpose()

    pos_vec = reviews_df['Positive'].map(int)
    words_df = build_words_df(vec, features, pos_vec)

    info = {'product_id' : product_id,
                    'tot_reviews': len(reviews_df), 
                    'pos_reviews': pos_vec.sum(),
                    'neg_reviews': len(reviews_df) - pos_vec.sum(),
                    'rating':      reviews_df['Overall'].mean()}

    words_df = words_df.sort('score').head(5)
    
    tokens = words_df.index
    snippets = {}    
    for token in tokens:
        snippets[token] = build_snippets_dict(reviews_df, vec, features, token)
    
    words_df['links'] = words_df.index.map(links_to_all_reviews(product_id))
    words_df['score'] = words_df['score'].map(np.absolute)
    words_df = words_df.reset_index()

    data = words_df[['tot_count', 'tokens', 'links']].to_dict()
    
    
    return jsonify({'product_info': info, 'data': data, 'snippets': snippets})
    


@app.route('/output')
def output():
    #pull 'ID' from input field and store it
    product_id = request.args.get('ID')

    reviews_df = get_reviews_df(product_id, db_connection_engine)
    
    vec = CountVectorizer(stop_words = 'english', encoding = 'utf8',
                      ngram_range = (1,2), token_pattern = "[a-zA-Z\'_]+", 
                      min_df = 2, binary = True)                      
    features = vec.fit_transform(reviews_df['Content']).transpose()

    pos_vec = reviews_df['Positive'].map(int)
    words_df = build_words_df(vec, features, pos_vec)

    info = {'product_id' : product_id,
                    'tot_reviews': len(reviews_df), 
                    'pos_reviews': pos_vec.sum(),
                    'neg_reviews': len(reviews_df) - pos_vec.sum(),
                    'rating':      reviews_df['Overall'].mean()}
                    
    words_df = words_df.sort('score').head(5).reset_index()
    words_df['args'] = words_df['tokens'].map(lambda x: "reviews?" + 
                            urllib.urlencode({'ID': product_id, 'keyword': x}))

    return render_template("output.html", table =  words_df.to_dict(orient = 'records'), 
                           stats = info, product_ID = product_id)


@app.route("/reviews/<path:product_id>")
def reviews_table(product_id):
    keyword = request.args.get('keyword')
    padded_key = " " + keyword + " "

    query = '''SELECT Title, Content, Overall FROM reviews 
                WHERE (ProductID = '%s' AND Content LIKE \"%%%%%s%%%%\") 
                ORDER BY Overall;''' % (product_id, padded_key)
    reviews_df = pd.read_sql(sql = query, con = db_connection_engine)
    
    re_key = re.compile(re.escape(padded_key), re.IGNORECASE)
    def highlight (text):
         # label label-success OR badge
        return Markup(re_key.sub(' <span class="badge"><big>%s</big></span> ' % keyword, text))
    
    reviews_df['Content'] = reviews_df['Content'].map(highlight)  
    reviews_df.columns = ['title', 'content', 'rating']
                           
    return render_template('display_table.html', 
                           table=reviews_df.to_dict(orient = 'records'), 
                           productID = product_id, keyword = keyword) 
