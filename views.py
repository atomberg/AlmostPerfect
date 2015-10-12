from flask import render_template, request, Markup, jsonify
from app import app

import re
from ap_lib_core import *

from sqlalchemy import create_engine
from sklearn.feature_extraction.text import CountVectorizer

db_connection_engine = create_engine('mysql://dummy:12345@127.0.0.1/amazon_reviews?charset=utf8')
cache_file = 'json_cache.db'
number_of_keywords_to_show = 4

@app.route('/')
@app.route('/index')
def index():
	return render_template("input.html")

@app.route('/product/<path:product_id>')
def fetch_json(product_id):
    cache = gdbm_shelve(cache_file) 
    try:
        result = cache[product_id]
    except KeyError:
        result = get_product_results(product_id)
        cache[product_id] = result
    finally:
        cache.close()
    
    return jsonify(result)
    
@app.route('/about')
def about():
    return render_template("about.html")

@app.route('/explore')
def explore_db():
    query = "SELECT ProductID, Title, ReviewCount FROM products WHERE ReviewCount > 49;"
    connection = db_connection_engine.connect()
    rows = connection.execute(query)
    connection.close()
    
    result = []
    for row in rows:    
        result.append([str(row[0]), str(row[1]), int(row[2])])
    
    return render_template("explore.html", data = result)

@app.route("/productinfo/<path:product_id>")
def product_info(product_id):
    query = "SELECT Title, Description, Image FROM products WHERE ProductID = '%s';" % product_id
    result = pd.read_sql(sql = query, con = db_connection_engine).to_dict(orient = 'records')[0]

    return jsonify({'title': result['Title'], 
                    'desc':  result['Description'],
                    'img':   result['Image']})


@app.route("/reviews/<path:product_id>")
def reviews_table(product_id):
    keyword = request.args.get('keyword')
    #padded_key = " " + keyword + " "
    mysql_key = " ".join(["+" + w for w in keyword.split(' ')])

    query = '''SELECT Title, Content, Overall FROM reviews 
            WHERE (
            ProductID = '%s' 
            AND 
            MATCH(Content) AGAINST (\'%s\' IN BOOLEAN MODE)
            ) 
            ORDER BY Overall;''' % (product_id, mysql_key)
    reviews_df = pd.read_sql(sql = query, con = db_connection_engine)
    
    
    regex = re.compile(re.escape(keyword), re.IGNORECASE)
    def highlight (text):
         # label label-success OR badge
        return Markup(regex.sub(' <span class="badge"><big>%s</big></span> ' % keyword, text))
        
    def match_keyword (text):
        return bool(regex.search(text))
    
    reviews_df = reviews_df[reviews_df['Content'].map(match_keyword)]
    reviews_df['Content'] = reviews_df['Content'].map(highlight)  
    reviews_df.columns = ['title', 'content', 'rating']
                           
    return render_template('display_table.html', 
                           table=reviews_df.to_dict(orient = 'records'), 
                           productID = product_id, keyword = keyword) 

                           
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

    words_df = words_df.sort('score').head(number_of_keywords_to_show)
    
    tokens = words_df.index
    snippets = {}    
    for token in tokens:
        snippets[token] = build_snippets_dict(reviews_df, vec, features, token)
    
    words_df['links'] = words_df.index.map(links_to_all_reviews(product_id))
    words_df['score'] = words_df['score'].map(np.absolute)
    words_df = words_df.reset_index()

    data = words_df[['tot_count', 'tokens', 'links']].to_dict()    
    return {'product_info': info, 'data': data, 'snippets': snippets}
